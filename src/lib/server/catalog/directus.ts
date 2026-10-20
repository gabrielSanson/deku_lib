// Reads the published menu from Directus. Collections are created by
// scripts/directus-bootstrap.ts; field names here must match it.
import { z } from 'zod';
import type { Catalog, Channel } from '#lib/domain/catalog.ts';

const status = z.enum(['published', 'draft', 'archived']);

const optionSchema = z.object({
	sku: z.string(),
	name: z.string(),
	price_cents: z.number().int().min(0),
	max_quantity: z.number().int().min(1).nullable().optional(),
	status,
	sort: z.number().nullable().optional()
});

const groupSchema = z.object({
	id: z.union([z.string(), z.number()]),
	key: z.string(),
	name: z.string(),
	min_selections: z.number().int().min(0),
	max_selections: z.number().int().min(0),
	options: z.array(optionSchema)
});

const productSchema = z.object({
	sku: z.string(),
	slug: z.string(),
	name: z.string(),
	description: z.string().nullable().optional(),
	image: z.string().nullable().optional(),
	category: z.union([z.string(), z.number()]).nullable(),
	price_cents: z.number().int().min(0),
	prep_station: z.string().nullable().optional(),
	channels: z.array(z.enum(['counter', 'web', 'ifood'])).nullable().optional(),
	allergens: z.array(z.string()).nullable().optional(),
	sort: z.number().nullable().optional(),
	modifier_groups: z
		.array(z.object({ sort: z.number().nullable().optional(), menu_modifier_groups_id: groupSchema.nullable() }))
		.nullable()
		.optional()
});

const categorySchema = z.object({
	id: z.union([z.string(), z.number()]),
	slug: z.string(),
	name: z.string(),
	sort: z.number().nullable().optional()
});

async function getItems<T>(
	baseUrl: string,
	token: string | undefined,
	path: string,
	schema: z.ZodType<T>
): Promise<T[]> {
	const res = await fetch(new URL(path, baseUrl), {
		headers: token ? { Authorization: `Bearer ${token}` } : {},
		signal: AbortSignal.timeout(5000)
	});
	if (!res.ok) throw new Error(`Directus ${path} returned ${res.status}`);
	const body = (await res.json()) as { data: unknown };
	return z.array(schema).parse(body.data);
}

export async function fetchDirectusCatalog(baseUrl: string, token?: string): Promise<Catalog> {
	const published = 'filter[status][_eq]=published&limit=-1';
	const [categories, products] = await Promise.all([
		getItems(baseUrl, token, `/items/menu_categories?${published}&sort=sort`, categorySchema),
		getItems(
			baseUrl,
			token,
			`/items/menu_products?${published}&sort=sort&fields=*,modifier_groups.sort,modifier_groups.menu_modifier_groups_id.*,modifier_groups.menu_modifier_groups_id.options.*`,
			productSchema
		)
	]);

	const catalog: Catalog = {
		version: '',
		categories: categories.map((c, i) => ({
			id: String(c.id),
			slug: c.slug,
			name: c.name,
			position: c.sort ?? i
		})),
		products: products
			.filter((p) => p.category !== null)
			.map((p) => ({
				sku: p.sku,
				slug: p.slug,
				name: p.name,
				description: p.description ?? '',
				imageUrl: p.image ? new URL(`/assets/${p.image}?width=640&format=webp`, baseUrl).toString() : null,
				categoryId: String(p.category),
				priceCents: p.price_cents,
				prepStation: p.prep_station || 'grill',
				channels: (p.channels ?? ['counter', 'web', 'ifood']) as Channel[],
				allergens: p.allergens ?? [],
				modifierGroups: (p.modifier_groups ?? [])
					.slice()
					.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
					.flatMap((link) => (link.menu_modifier_groups_id ? [link.menu_modifier_groups_id] : []))
					.map((g) => ({
						id: g.key,
						name: g.name,
						minSelections: g.min_selections,
						maxSelections: g.max_selections,
						options: g.options
							.filter((o) => o.status === 'published')
							.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
							.map((o) => ({
								sku: o.sku,
								name: o.name,
								priceCents: o.price_cents,
								maxQuantity: o.max_quantity ?? 1
							}))
					}))
			}))
	};
	catalog.version = await catalogHash(catalog);
	return catalog;
}

async function catalogHash(catalog: Catalog): Promise<string> {
	const data = new TextEncoder().encode(JSON.stringify({ ...catalog, version: '' }));
	const digest = await crypto.subtle.digest('SHA-256', data);
	return (
		'cms-' +
		Array.from(new Uint8Array(digest).slice(0, 8))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')
	);
}
