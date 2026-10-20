// Catalog access for the app. The menu lives in our own tables and is edited in
// the staff area (see ./editor.ts); live sold-out overrides are separate.
// Prices are always re-read here at order time.
import type { Catalog, Channel, ModifierGroup } from '#lib/domain/catalog.ts';
import { db, type Db } from '../db';
import { menuImageUrl } from './images';

const TTL_MS = 10_000;
let cache: { catalog: Catalog; at: number } | undefined;

export class CatalogUnavailableError extends Error {}

/** Reads the active menu from the database. */
export async function loadCatalog(sql: Db = db(), { includeInactive = false } = {}) {
	const [[rev], categories, products, groups, options, links] = await Promise.all([
		sql<{ revision: string }[]>`select revision::text from menu_revision where id = 1`,
		sql<{ id: string; name: string; position: number; active: boolean }[]>`
			select id, name, position, active from menu_categories order by position, name`,
		sql<
			{
				sku: string;
				slug: string;
				name: string;
				description: string;
				image_path: string | null;
				category_id: string;
				price_cents: number;
				prep_station: string;
				channels: Channel[];
				allergens: string[];
				active: boolean;
			}[]
		>`select sku, slug, name, description, image_path, category_id, price_cents, prep_station,
				channels, allergens, active
			from menu_products order by position, name`,
		sql<{ id: string; name: string; min_selections: number; max_selections: number }[]>`
			select id, name, min_selections, max_selections from menu_modifier_groups order by name`,
		sql<
			{
				sku: string;
				group_id: string;
				name: string;
				price_cents: number;
				max_quantity: number;
				active: boolean;
			}[]
		>`select sku, group_id, name, price_cents, max_quantity, active
			from menu_modifier_options order by position, name`,
		sql<{ product_sku: string; group_id: string }[]>`
			select product_sku, group_id from menu_product_groups order by position`
	]);
	const groupById = new Map<string, ModifierGroup>(
		groups.map((g) => [
			g.id,
			{
				id: g.id,
				name: g.name,
				minSelections: g.min_selections,
				maxSelections: g.max_selections,
				options: options
					.filter((o) => o.group_id === g.id && (includeInactive || o.active))
					.map((o) => ({
						sku: o.sku,
						name: o.name,
						priceCents: o.price_cents,
						maxQuantity: o.max_quantity
					}))
			}
		])
	);
	const activeCategories = new Set(
		categories.filter((c) => includeInactive || c.active).map((c) => c.id)
	);
	const catalog: Catalog = {
		version: `menu-${rev?.revision ?? '0'}`,
		categories: categories
			.filter((c) => activeCategories.has(c.id))
			.map((c) => ({ id: c.id, slug: c.id, name: c.name, position: c.position })),
		products: products
			.filter((p) => (includeInactive || p.active) && activeCategories.has(p.category_id))
			.map((p) => ({
				sku: p.sku,
				slug: p.slug,
				name: p.name,
				description: p.description,
				imageUrl: menuImageUrl(p.image_path),
				categoryId: p.category_id,
				priceCents: p.price_cents,
				prepStation: p.prep_station,
				channels: p.channels,
				allergens: p.allergens,
				modifierGroups: links
					.filter((l) => l.product_sku === p.sku)
					.map((l) => groupById.get(l.group_id))
					.filter((g): g is ModifierGroup => Boolean(g))
			}))
	};
	return catalog;
}

/** Published catalog, cached briefly. Serves the last good copy if the database blips. */
export async function getCatalog({ fresh = false } = {}): Promise<Catalog> {
	if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache.catalog;
	try {
		const catalog = await loadCatalog();
		cache = { catalog, at: Date.now() };
		return catalog;
	} catch (err) {
		console.error(JSON.stringify({ msg: 'catalog load failed', err: String(err) }));
		if (cache && !fresh) return cache.catalog;
		throw new CatalogUnavailableError('Cardápio indisponível no momento.');
	}
}

/** Catalog for pricing an order: always read fresh. */
export async function getCatalogForPricing(): Promise<Catalog> {
	return getCatalog({ fresh: true });
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
