// Catalog access for the app. The CMS owns menu content; the app owns
// live sold-out overrides. Prices are always re-read here at order time.
import type { Catalog, Channel } from '#lib/domain/catalog.ts';
import { config } from '../config';
import type { Db } from '../db';
import { fetchDirectusCatalog } from './directus';
import { fixtureCatalog } from './fixture';

const TTL_MS = 30_000;
let cache: { catalog: Catalog; at: number } | undefined;

export class CatalogUnavailableError extends Error {}

/** Published catalog. Serves the last good copy if the CMS is briefly down. */
export async function getCatalog({ fresh = false } = {}): Promise<Catalog> {
	const { DIRECTUS_URL, DIRECTUS_TOKEN } = config();
	if (!DIRECTUS_URL) return fixtureCatalog;
	if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache.catalog;
	try {
		const catalog = await fetchDirectusCatalog(DIRECTUS_URL, DIRECTUS_TOKEN);
		cache = { catalog, at: Date.now() };
		return catalog;
	} catch (err) {
		console.error(JSON.stringify({ msg: 'catalog fetch failed', err: String(err) }));
		if (cache && !fresh) return cache.catalog;
		throw new CatalogUnavailableError('Cardápio indisponível no momento.');
	}
}

/**
 * Catalog for pricing an order. Uses a fresh CMS read when possible, but may
 * fall back to a copy no older than five minutes so the counter keeps working
 * through a short CMS outage.
 */
export async function getCatalogForPricing(): Promise<Catalog> {
	try {
		return await getCatalog({ fresh: true });
	} catch (err) {
		if (cache && Date.now() - cache.at < 5 * 60_000) return cache.catalog;
		throw err;
	}
}

export function invalidateCatalog() {
	cache = undefined;
}

export async function soldOutSkus(sql: Db, channel: Channel): Promise<Set<string>> {
	const rows = await sql<{ sku: string }[]>`
		select sku from product_availability_overrides
		where sold_out and channel in ('all', ${channel})
	`;
	return new Set(rows.map((r) => r.sku));
}
