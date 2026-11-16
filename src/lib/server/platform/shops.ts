// Which shop a request is for. Platform code: reads the shops table with the main pool.
import { config } from '../config';
import { DEFAULT_SHOP_ID, platformDb } from '../db';

export type ShopStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'closed';

export interface ShopInfo {
	id: string;
	slug: string;
	name: string;
	status: ShopStatus;
	preset: string;
	businessType: string;
	timezone: string;
	plan: string;
	trialEndsAt: Date | null;
}

interface Row {
	id: string;
	slug: string;
	name: string;
	status: ShopStatus;
	preset: string;
	business_type: string;
	timezone: string;
	plan: string;
	trial_ends_at: Date | null;
}

// Shops seen by this process, so synchronous code (presets) can know the current shop's look.
const known = new Map<string, ShopInfo>();

/** The shop's record if this process has loaded it (requests and jobs load it first). */
export function knownShop(id: string): ShopInfo | undefined {
	return known.get(id);
}

function toShop(r: Row): ShopInfo {
	const shop: ShopInfo = {
		id: r.id,
		slug: r.slug,
		name: r.name,
		status: r.status,
		preset: r.preset,
		businessType: r.business_type,
		timezone: r.timezone,
		plan: r.plan,
		trialEndsAt: r.trial_ends_at
	};
	known.set(shop.id, shop);
	return shop;
}

/** Loads (and remembers) every shop that is open for business. */
export async function openShops(): Promise<ShopInfo[]> {
	const rows = await platformDb()<Row[]>`
		select id, slug, name, status, preset, business_type, timezone, plan, trial_ends_at
		from shops where status in ('trial', 'active', 'past_due') order by created_at`;
	return rows.map(toShop);
}

const TTL_MS = 60_000;
const byHost = new Map<string, { shop: ShopInfo | null; at: number }>();

/** Forget cached lookups, e.g. after a shop's status or domains change. */
export function invalidateShopCache() {
	byHost.clear();
}

export async function getShop(id: string): Promise<ShopInfo | null> {
	const [r] = await platformDb()<Row[]>`
		select id, slug, name, status, preset, business_type, timezone, plan, trial_ends_at
		from shops where id = ${id}`;
	return r ? toShop(r) : null;
}

/** Strips the port and lowercases: "Loja.Example.com:443" → "loja.example.com". */
export function normalizeHost(host: string): string {
	return host.toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}

/**
 * The shop for a host. Single-shop installs always get the default shop. Multi-shop installs look
 * the host up in shop_domains; an unknown host (the platform's own site) gives null.
 */
export async function resolveShop(rawHost: string, now = Date.now()): Promise<ShopInfo | null> {
	const single = config().TENANCY !== 'multi';
	const host = single ? '*' : normalizeHost(rawHost);
	const hit = byHost.get(host);
	if (hit && now - hit.at < TTL_MS) return hit.shop;
	let shop: ShopInfo | null;
	if (single) {
		shop = await getShop(DEFAULT_SHOP_ID);
	} else {
		const [r] = await platformDb()<Row[]>`
			select s.id, s.slug, s.name, s.status, s.preset, s.business_type, s.timezone, s.plan, s.trial_ends_at
			from shop_domains d join shops s on s.id = d.shop_id
			where d.host = ${host} and (d.kind = 'platform' or d.verified_at is not null)
				and s.status <> 'closed'`;
		shop = r ? toShop(r) : null;
	}
	byHost.set(host, { shop, at: now });
	return shop;
}

let tenancySynced = false;
/** Writes TENANCY into platform_config so the database's fallback shop matches the app. */
export async function syncTenancy() {
	if (tenancySynced) return;
	const c = config();
	await platformDb()`update platform_config set tenancy = ${c.TENANCY} where id = 1`;
	if (c.TENANCY === 'multi' && c.PLATFORM_DOMAIN) {
		// Shop #1 (the install's original shop) gets its address on the platform.
		await platformDb()`
			insert into shop_domains (host, shop_id, kind)
			select s.slug || '.' || ${c.PLATFORM_DOMAIN}, s.id, 'platform' from shops s
			where s.id = ${DEFAULT_SHOP_ID}
				and not exists (select 1 from shop_domains d where d.shop_id = s.id)
			on conflict do nothing`;
	}
	tenancySynced = true;
}

/** The shop's public address for links in messages: its custom domain, its platform address, or ORIGIN. */
export async function shopOrigin(shopId: string): Promise<string> {
	const [d] = await platformDb()<{ host: string }[]>`
		select host from shop_domains where shop_id = ${shopId}
		order by (kind = 'custom' and verified_at is not null) desc, kind = 'platform' desc, host limit 1`;
	if (d) return `https://${d.host}`;
	return (process.env.ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
}
