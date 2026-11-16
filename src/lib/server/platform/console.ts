// The platform console: every shop at a glance, one shop's details, and the actions a platform
// admin takes (suspend, reactivate, extend a trial, look at a shop read-only).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { audit, type Actor } from '../audit';
import { config } from '../config';
import { platformDb, withShop } from '../db';
import { DomainError } from '../errors';
import { invalidateShopCache, type ShopStatus } from './shops';

export interface ShopListRow {
	id: string;
	name: string;
	slug: string;
	status: ShopStatus;
	plan: string;
	trialEndsAt: Date | null;
	lastOrderAt: Date | null;
	orders7d: number;
	openAlerts: number;
	host: string | null;
}

export async function listShops(): Promise<ShopListRow[]> {
	const rows = await platformDb()<
		{
			id: string;
			name: string;
			slug: string;
			status: ShopStatus;
			plan: string;
			trial_ends_at: Date | null;
			last_order_at: Date | null;
			orders_7d: number;
			open_alerts: number;
			host: string | null;
		}[]
	>`
		select s.id, s.name, s.slug, s.status, s.plan, s.trial_ends_at,
			(select max(o.created_at) from orders o where o.shop_id = s.id and not o.is_test) as last_order_at,
			(select count(*)::int from orders o where o.shop_id = s.id and not o.is_test
				and o.created_at > now() - interval '7 days') as orders_7d,
			(select count(*)::int from alerts a where a.shop_id = s.id and a.resolved_at is null) as open_alerts,
			(select d.host from shop_domains d where d.shop_id = s.id order by d.kind = 'custom' desc, d.host limit 1) as host
		from shops s order by s.created_at desc`;
	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		slug: r.slug,
		status: r.status,
		plan: r.plan,
		trialEndsAt: r.trial_ends_at,
		lastOrderAt: r.last_order_at,
		orders7d: r.orders_7d,
		openAlerts: r.open_alerts,
		host: r.host
	}));
}

export async function shopDetail(id: string) {
	const [shop] = await platformDb()<
		{
			id: string;
			name: string;
			slug: string;
			status: ShopStatus;
			plan: string;
			trial_ends_at: Date | null;
			created_at: Date;
			business_type: string;
		}[]
	>`select id, name, slug, status, plan, trial_ends_at, created_at, business_type from shops where id = ${id}`;
	if (!shop) return null;
	const [members, domains, auditRows, failedJobs] = await Promise.all([
		platformDb()<
			{
				user_id: string;
				display_name: string;
				role: string;
				active: boolean;
				email: string | null;
			}[]
		>`
			select m.user_id, m.display_name, m.role, m.active, u.email
			from shop_members m left join auth.users u on u.id = m.user_id
			where m.shop_id = ${id} order by m.role, m.display_name`,
		platformDb()<{ host: string; kind: string; verified_at: Date | null }[]>`
			select host, kind, verified_at from shop_domains where shop_id = ${id} order by kind, host`,
		platformDb()<
			{ id: string; created_at: Date; actor_type: string; action: string; object_type: string }[]
		>`
			select id::text, created_at, actor_type, action, object_type from audit_log
			where shop_id = ${id} order by created_at desc limit 50`,
		failedJobsOf(id)
	]);
	return { shop, members, domains, audit: auditRows, failedJobs };
}

async function failedJobsOf(shopId: string) {
	try {
		return await platformDb()<
			{ id: string; name: string; completed_on: Date | null; output: unknown }[]
		>`
			select id::text, name, completed_on, output from pgboss.job
			where state = 'failed' and data->>'shopId' = ${shopId}
			order by completed_on desc nulls last limit 20`;
	} catch {
		// pg-boss creates its schema when the worker first starts.
		return [];
	}
}

async function platformAudit(
	shopId: string,
	actor: Actor,
	action: string,
	summary: Record<string, unknown>
) {
	await withShop(shopId, (sql) => audit(sql, actor, action, 'shop', shopId, summary));
}

export async function setShopStatus(id: string, status: 'active' | 'suspended', actor: Actor) {
	const [r] = await platformDb()<{ before: ShopStatus }[]>`
		update shops s set status = ${status} from (select status as before from shops where id = ${id}) b
		where s.id = ${id} and s.status <> 'closed' returning b.before`;
	if (!r) throw new DomainError({ text: 'Loja não encontrada ou encerrada.' }, { status: 404 });
	invalidateShopCache();
	await platformAudit(id, actor, status === 'suspended' ? 'shop.suspended' : 'shop.reactivated', {
		from: r.before
	});
}

export async function extendTrial(id: string, days: number, actor: Actor) {
	if (!Number.isInteger(days) || days < 1 || days > 90) {
		throw new DomainError({ text: 'Informe de 1 a 90 dias.' });
	}
	await platformDb()`
		update shops set trial_ends_at = greatest(coalesce(trial_ends_at, now()), now()) + make_interval(days => ${days}),
			status = case when status in ('past_due', 'suspended') then 'trial' else status end
		where id = ${id}`;
	invalidateShopCache();
	await platformAudit(id, actor, 'shop.trial_extended', { days });
}

export async function setPlanPrice(code: string, priceCents: number, actor: Actor) {
	if (!Number.isInteger(priceCents) || priceCents < 0)
		throw new DomainError({ text: 'Preço inválido.' });
	await platformDb()`update plans set price_cents = ${priceCents} where code = ${code}`;
	await audit(platformDb(), actor, 'plan.price_set', 'plan', null, {
		code,
		price_cents: priceCents
	});
}

// "Ver como a loja": a signed, short-lived link that opens the shop's staff screens read-only.
export const VIEW_TTL_MS = 30 * 60_000;
export const PLATFORM_VIEW_COOKIE = 'platform_view';

function sign(payload: string) {
	const secret = config().APP_SECRET;
	if (!secret)
		throw new DomainError('err.settings.appSecret', { code: 'no_app_secret', status: 501 });
	return createHmac('sha256', `platform-view:${secret}`).update(payload).digest('base64url');
}

export function viewToken(shopId: string, adminId: string, now = Date.now()): string {
	const payload = `${shopId}.${adminId}.${now + VIEW_TTL_MS}`;
	return `${payload}.${sign(payload)}`;
}

/** The admin a view token belongs to, if it is valid for this shop and not expired. */
export function readViewToken(token: string, shopId: string, now = Date.now()): string | null {
	const parts = token.split('.');
	if (parts.length !== 4) return null;
	const [shop, admin, exp, mac] = parts;
	if (shop !== shopId || Number(exp) < now) return null;
	let expected: string;
	try {
		expected = sign(`${shop}.${admin}.${exp}`);
	} catch {
		return null;
	}
	const a = Buffer.from(mac);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b) ? admin : null;
}
