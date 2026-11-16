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

function toShop(r: Row): ShopInfo {
	return {
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
	await platformDb()`update platform_config set tenancy = ${config().TENANCY} where id = 1`;
	tenancySynced = true;
}
