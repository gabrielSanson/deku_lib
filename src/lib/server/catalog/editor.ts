// Menu editing for managers. Every change bumps the menu revision (orders record
// which revision priced them), is audited, and drops the in-process cache.
import { z } from 'zod';
import type { Catalog } from '#lib/domain/catalog.ts';
import { skuFrom, slugify } from '#lib/domain/slug.ts';
import { audit, type Actor } from '../audit';
import { db, type Db, type Tx } from '../db';
import { DomainError } from '../errors';
import { IMAGE_PATH, menuImageUrl } from './images';
import { invalidateCatalog } from './service';

const CHANNELS = ['counter', 'web', 'ifood'] as const;
export const PREP_STATIONS = [
	{ id: 'grill', label: 'Chapa' },
	{ id: 'fryer', label: 'Fritadeira' },
	{ id: 'counter', label: 'Balcão' },
	{ id: 'bar', label: 'Bebidas' }
] as const;

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/, 'Identificador inválido.');
const sku = z
	.string()
	.regex(/^[A-Z0-9][A-Z0-9-]{0,39}$/, 'Código (SKU) inválido: use letras maiúsculas, números e -.');
const cents = z.number().int().min(0).max(10_000_000);

async function changed(
	tx: Tx,
	actor: Actor,
	action: string,
	type: string,
	objectId: string,
	summary = {}
) {
	await tx`update menu_revision set revision = revision + 1, updated_at = now() where id = 1`;
	await audit(tx, actor, action, type, objectId, summary);
}

function done<T>(value: T) {
	invalidateCatalog();
	return value;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categoryInput = z.object({
	id: id.optional(),
	name: z.string().trim().min(1, 'Informe o nome.').max(80),
	position: z.number().int().default(0),
	active: z.boolean().default(true),
	/** undefined keeps the current photo, null removes it. */
	imagePath: z.string().regex(IMAGE_PATH).nullable().optional()
});

export async function saveCategory(input: z.input<typeof categoryInput>, actor: Actor) {
	const c = categoryInput.parse(input);
	return done(
		await db().begin(async (tx) => {
			const catId = c.id ?? (slugify(c.name) || 'categoria');
			if (c.id) {
				const r = await tx`update menu_categories set name = ${c.name}, position = ${c.position},
					active = ${c.active}, updated_at = now(),
					image_path = ${c.imagePath === undefined ? tx`image_path` : c.imagePath}
					where id = ${c.id}`;
				if (!r.count)
					throw new DomainError('err.menu.categoryNotFound', { code: 'not_found', status: 404 });
			} else {
				const r = await tx`insert into menu_categories (id, name, position, active, image_path)
					values (${catId}, ${c.name}, ${c.position}, ${c.active}, ${c.imagePath ?? null})
					on conflict (id) do nothing`;
				if (!r.count) throw new DomainError('err.menu.categoryTaken', { code: 'duplicate' });
			}
			await changed(
				tx,
				actor,
				c.id ? 'menu.category_updated' : 'menu.category_created',
				'menu_category',
				catId,
				c
			);
			return catId;
		})
	);
}

export async function deleteCategory(catId: string, actor: Actor) {
	return done(
		await db().begin(async (tx) => {
			const [{ n }] = await tx<{ n: number }[]>`
				select count(*)::int n from menu_products where category_id = ${catId}`;
			if (n) throw new DomainError('err.menu.categoryNotEmpty', { code: 'not_empty' });
			await tx`delete from menu_categories where id = ${catId}`;
			await changed(tx, actor, 'menu.category_deleted', 'menu_category', catId);
		})
	);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const productInput = z.object({
	sku: sku.optional(),
	slug: id.optional(),
	name: z.string().trim().min(1, 'Informe o nome.').max(120),
	description: z.string().trim().max(600).default(''),
	categoryId: id,
	priceCents: cents,
	prepStation: z.enum(PREP_STATIONS.map((s) => s.id) as ['grill', 'fryer', 'counter', 'bar']),
	channels: z.array(z.enum(CHANNELS)).min(1, 'Escolha pelo menos um canal de venda.'),
	allergens: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
	groupIds: z.array(id).max(20).default([]),
	ingredients: z
		.array(z.object({ id, removable: z.boolean().default(true) }))
		.max(30)
		.default([]),
	position: z.number().int().default(0),
	active: z.boolean().default(true),
	imagePath: z.string().regex(IMAGE_PATH).nullable().optional()
});
export type ProductInput = z.input<typeof productInput>;

async function uniqueSku(tx: Db, base: string) {
	const root = base || 'PRODUTO';
	for (let i = 1; ; i++) {
		const candidate = i === 1 ? root : `${root.slice(0, 36)}-${i}`;
		const [hit] = await tx`select 1 from menu_products where sku = ${candidate}
			union all select 1 from menu_modifier_options where sku = ${candidate}`;
		if (!hit) return candidate;
	}
}

async function uniqueSlug(tx: Db, base: string, except: string | null) {
	const root = base || 'produto';
	for (let i = 1; ; i++) {
		const candidate = i === 1 ? root : `${root.slice(0, 74)}-${i}`;
		const [hit] =
			await tx`select 1 from menu_products where slug = ${candidate} and sku is distinct from ${except}`;
		if (!hit) return candidate;
	}
}

/** Creates (no `existingSku`) or updates a product. The SKU never changes after creation. */
export async function saveProduct(input: ProductInput, actor: Actor, existingSku?: string) {
	const p = productInput.parse(input);
	return done(
		await db().begin(async (tx) => {
			const [cat] = await tx`select 1 from menu_categories where id = ${p.categoryId}`;
			if (!cat) throw new DomainError('err.menu.pickCategory', { code: 'category' });
			let productSku = existingSku;
			const slug = await uniqueSlug(tx, p.slug ?? slugify(p.name, 80), existingSku ?? null);
			if (existingSku) {
				const r = await tx`
					update menu_products set slug = ${slug}, name = ${p.name}, description = ${p.description},
						category_id = ${p.categoryId}, price_cents = ${p.priceCents}, prep_station = ${p.prepStation},
						channels = ${p.channels}, allergens = ${p.allergens}, position = ${p.position},
						active = ${p.active},
						image_path = ${p.imagePath === undefined ? tx`image_path` : p.imagePath},
						updated_at = now()
					where sku = ${existingSku}`;
				if (!r.count)
					throw new DomainError('err.menu.productNotFound', { code: 'not_found', status: 404 });
			} else {
				productSku = p.sku ?? (await uniqueSku(tx, skuFrom(p.name)));
				const [clash] = await tx`select 1 from menu_products where sku = ${productSku}
					union all select 1 from menu_modifier_options where sku = ${productSku}`;
				if (clash) throw new DomainError('err.menu.skuTaken', { code: 'duplicate' });
				await tx`
					insert into menu_products (sku, slug, name, description, category_id, price_cents, prep_station,
						channels, allergens, position, active, image_path)
					values (${productSku}, ${slug}, ${p.name}, ${p.description}, ${p.categoryId}, ${p.priceCents},
						${p.prepStation}, ${p.channels}, ${p.allergens}, ${p.position}, ${p.active}, ${p.imagePath ?? null})`;
			}
			await tx`delete from menu_product_groups where product_sku = ${productSku!}`;
			for (const [i, g] of p.groupIds.entries()) {
				await tx`insert into menu_product_groups (product_sku, group_id, position)
					values (${productSku!}, ${g}, ${i}) on conflict do nothing`;
			}
			await tx`delete from menu_product_ingredients where product_sku = ${productSku!}`;
			for (const [i, ing] of p.ingredients.entries()) {
				const r =
					await tx`insert into menu_product_ingredients (product_sku, ingredient_id, removable, position)
					select ${productSku!}, id, ${ing.removable}, ${i} from menu_ingredients where id = ${ing.id}
					on conflict do nothing`;
				if (!r.count) throw new DomainError('err.menu.ingredientNotFound', { code: 'ingredient' });
			}
			await changed(
				tx,
				actor,
				existingSku ? 'menu.product_updated' : 'menu.product_created',
				'menu_product',
				productSku!,
				{ ...p, imagePath: undefined }
			);
			return productSku!;
		})
	);
}

export async function deleteProduct(productSku: string, actor: Actor) {
	return done(
		await db().begin(async (tx) => {
			await tx`delete from menu_products where sku = ${productSku}`;
			await changed(tx, actor, 'menu.product_deleted', 'menu_product', productSku);
		})
	);
}

// ---------------------------------------------------------------------------
// Option groups
// ---------------------------------------------------------------------------

export const groupInput = z
	.object({
		id: id.optional(),
		name: z.string().trim().min(1, 'Informe o nome do grupo.').max(80),
		minSelections: z.number().int().min(0).max(20),
		maxSelections: z.number().int().min(1).max(20),
		options: z
			.array(
				z.object({
					sku: sku.optional(),
					name: z.string().trim().min(1, 'Informe o nome da opção.').max(80),
					priceCents: z.number().int().min(0).max(1_000_000),
					maxQuantity: z.number().int().min(1).max(20).default(1),
					active: z.boolean().default(true),
					/** Undefined keeps the saved photo; null removes it. */
					imagePath: z.string().regex(IMAGE_PATH).nullable().optional()
				})
			)
			.min(1, 'Adicione pelo menos uma opção.')
			.max(40)
	})
	.refine((g) => g.maxSelections >= g.minSelections, 'O máximo precisa ser maior que o mínimo.');

export async function saveGroup(input: z.input<typeof groupInput>, actor: Actor) {
	const g = groupInput.parse(input);
	return done(
		await db().begin(async (tx) => {
			const groupId = g.id ?? (slugify(g.name) || 'grupo');
			if (g.id) {
				const r = await tx`update menu_modifier_groups set name = ${g.name},
					min_selections = ${g.minSelections}, max_selections = ${g.maxSelections}, updated_at = now()
					where id = ${g.id}`;
				if (!r.count)
					throw new DomainError('err.menu.groupNotFound', { code: 'not_found', status: 404 });
			} else {
				const r =
					await tx`insert into menu_modifier_groups (id, name, min_selections, max_selections)
					values (${groupId}, ${g.name}, ${g.minSelections}, ${g.maxSelections}) on conflict (id) do nothing`;
				if (!r.count) throw new DomainError('err.menu.groupTaken', { code: 'duplicate' });
			}
			const prefix = skuFrom(g.name).split('-')[0]?.slice(0, 6) || 'OPC';
			const kept: string[] = [];
			for (const [i, o] of g.options.entries()) {
				let optionSku = o.sku;
				if (!optionSku) optionSku = await uniqueSku(tx, skuFrom(o.name, prefix));
				const [owner] = await tx<{ group_id: string }[]>`
					select group_id from menu_modifier_options where sku = ${optionSku}`;
				const [productClash] = await tx`select 1 from menu_products where sku = ${optionSku}`;
				if (productClash || (owner && owner.group_id !== groupId)) {
					throw new DomainError('err.menu.optionSkuTaken', {
						code: 'duplicate',
						vars: { sku: optionSku }
					});
				}
				await tx`
					insert into menu_modifier_options
						(sku, group_id, name, price_cents, max_quantity, position, active, image_path)
					values (${optionSku}, ${groupId}, ${o.name}, ${o.priceCents}, ${o.maxQuantity}, ${i},
						${o.active}, ${o.imagePath ?? null})
					on conflict (sku) do update set name = excluded.name, price_cents = excluded.price_cents,
						max_quantity = excluded.max_quantity, position = excluded.position, active = excluded.active,
						image_path = ${o.imagePath === undefined ? tx`menu_modifier_options.image_path` : o.imagePath},
						updated_at = now()`;
				kept.push(optionSku);
			}
			await tx`delete from menu_modifier_options where group_id = ${groupId} and sku <> all(${kept})`;
			await changed(
				tx,
				actor,
				g.id ? 'menu.group_updated' : 'menu.group_created',
				'menu_group',
				groupId,
				g
			);
			return groupId;
		})
	);
}

export async function deleteGroup(groupId: string, actor: Actor) {
	return done(
		await db().begin(async (tx) => {
			await tx`delete from menu_modifier_groups where id = ${groupId}`;
			await changed(tx, actor, 'menu.group_deleted', 'menu_group', groupId);
		})
	);
}

// ---------------------------------------------------------------------------
// Ingredients
// ---------------------------------------------------------------------------

export const ingredientInput = z.object({
	id: id.optional(),
	name: z.string().trim().min(1, 'Informe o nome do ingrediente.').max(80),
	allergens: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
	position: z.number().int().default(0),
	/** Undefined keeps the saved photo; null removes it. */
	imagePath: z.string().regex(IMAGE_PATH).nullable().optional()
});

export async function saveIngredient(input: z.input<typeof ingredientInput>, actor: Actor) {
	const g = ingredientInput.parse(input);
	return done(
		await db().begin(async (tx) => {
			const ingredientId = g.id ?? (slugify(g.name) || 'ingrediente');
			if (g.id) {
				const r = await tx`update menu_ingredients set name = ${g.name}, allergens = ${g.allergens},
					position = ${g.position},
					image_path = ${g.imagePath === undefined ? tx`image_path` : g.imagePath},
					updated_by = ${actor.id}, updated_at = now() where id = ${g.id}`;
				if (!r.count)
					throw new DomainError('err.menu.ingredientNotFound', { code: 'not_found', status: 404 });
			} else {
				const r = await tx`insert into menu_ingredients
						(id, name, allergens, position, image_path, updated_by)
					values (${ingredientId}, ${g.name}, ${g.allergens}, ${g.position}, ${g.imagePath ?? null},
						${actor.id})
					on conflict (id) do nothing`;
				if (!r.count) throw new DomainError('err.menu.ingredientTaken', { code: 'duplicate' });
			}
			await changed(
				tx,
				actor,
				g.id ? 'menu.ingredient_updated' : 'menu.ingredient_created',
				'menu_ingredient',
				ingredientId,
				g
			);
			return ingredientId;
		})
	);
}

export async function deleteIngredient(ingredientId: string, actor: Actor) {
	return done(
		await db().begin(async (tx) => {
			await tx`delete from menu_ingredients where id = ${ingredientId}`;
			await changed(tx, actor, 'menu.ingredient_deleted', 'menu_ingredient', ingredientId);
		})
	);
}

/** Marks an ingredient as run out (or back). Operational, so the menu revision stays put. */
export async function setIngredientAvailable(
	ingredientId: string,
	available: boolean,
	actor: Actor
) {
	await db().begin(async (tx) => {
		const r = await tx`update menu_ingredients set available = ${available},
			unavailable_at = ${available ? null : tx`now()`}, updated_by = ${actor.id}, updated_at = now()
			where id = ${ingredientId}`;
		if (!r.count)
			throw new DomainError('err.menu.ingredientNotFound', { code: 'not_found', status: 404 });
		await audit(
			tx,
			actor,
			available ? 'menu.ingredient_back' : 'menu.ingredient_out',
			'menu_ingredient',
			ingredientId
		);
	});
}

export interface IngredientRow {
	id: string;
	name: string;
	allergens: string[];
	position: number;
	available: boolean;
	unavailableAt: Date | null;
	imageUrl: string | null;
	products: string[];
}

export async function listIngredients(sql: Db = db()): Promise<IngredientRow[]> {
	const rows = await sql<
		{
			id: string;
			name: string;
			allergens: string[];
			position: number;
			available: boolean;
			unavailable_at: Date | null;
			image_path: string | null;
			products: string[];
		}[]
	>`
		select i.id, i.name, i.allergens, i.position, i.available, i.unavailable_at, i.image_path,
			coalesce(array_agg(p.name order by p.name) filter (where p.sku is not null), '{}') as products
		from menu_ingredients i
		left join menu_product_ingredients pi on pi.ingredient_id = i.id
		left join menu_products p on p.sku = pi.product_sku
		group by i.id order by i.position, i.name`;
	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		allergens: r.allergens,
		position: r.position,
		available: r.available,
		unavailableAt: r.unavailable_at,
		imageUrl: menuImageUrl(r.image_path),
		products: r.products
	}));
}

// ---------------------------------------------------------------------------
// Bulk
// ---------------------------------------------------------------------------

export async function menuIsEmpty(sql: Db = db()) {
	const [r] = await sql<{ n: number }[]>`select count(*)::int n from menu_products`;
	return r.n === 0;
}

/** Copies a whole catalog in (used for the sample menu and tests). Existing entries are updated. */
export async function importCatalog(catalog: Catalog, actor: Actor, sql: Db = db()) {
	const run = async (tx: Tx) => {
		for (const c of catalog.categories) {
			await tx`insert into menu_categories (id, name, position) values (${c.id}, ${c.name}, ${c.position})
				on conflict (id) do update set name = excluded.name, position = excluded.position`;
		}
		const groups = new Map(catalog.products.flatMap((p) => p.modifierGroups).map((g) => [g.id, g]));
		for (const g of groups.values()) {
			await tx`insert into menu_modifier_groups (id, name, min_selections, max_selections)
				values (${g.id}, ${g.name}, ${g.minSelections}, ${g.maxSelections})
				on conflict (id) do update set name = excluded.name, min_selections = excluded.min_selections,
					max_selections = excluded.max_selections`;
			for (const [i, o] of g.options.entries()) {
				await tx`insert into menu_modifier_options (sku, group_id, name, price_cents, max_quantity, position)
					values (${o.sku}, ${g.id}, ${o.name}, ${o.priceCents}, ${o.maxQuantity}, ${i})
					on conflict (sku) do update set group_id = excluded.group_id, name = excluded.name,
						price_cents = excluded.price_cents, max_quantity = excluded.max_quantity, position = excluded.position`;
			}
		}
		const ingredients = new Map(
			catalog.products.flatMap((p) => p.ingredients).map((i) => [i.id, i])
		);
		for (const [i, ing] of [...ingredients.values()].entries()) {
			await tx`insert into menu_ingredients (id, name, allergens, position)
				values (${ing.id}, ${ing.name}, ${[] as string[]}, ${i})
				on conflict (id) do update set name = excluded.name, allergens = excluded.allergens,
					position = excluded.position`;
		}
		for (const [i, p] of catalog.products.entries()) {
			await tx`insert into menu_products (sku, slug, name, description, category_id, price_cents, prep_station,
					channels, allergens, position)
				values (${p.sku}, ${p.slug}, ${p.name}, ${p.description}, ${p.categoryId}, ${p.priceCents},
					${p.prepStation}, ${p.channels}, ${p.allergens}, ${i})
				on conflict (sku) do update set slug = excluded.slug, name = excluded.name,
					description = excluded.description, category_id = excluded.category_id,
					price_cents = excluded.price_cents, prep_station = excluded.prep_station,
					channels = excluded.channels, allergens = excluded.allergens, position = excluded.position`;
			await tx`delete from menu_product_groups where product_sku = ${p.sku}`;
			for (const [j, g] of p.modifierGroups.entries()) {
				await tx`insert into menu_product_groups (product_sku, group_id, position) values (${p.sku}, ${g.id}, ${j})`;
			}
			await tx`delete from menu_product_ingredients where product_sku = ${p.sku}`;
			for (const [j, ing] of p.ingredients.entries()) {
				await tx`insert into menu_product_ingredients (product_sku, ingredient_id, removable, position)
					values (${p.sku}, ${ing.id}, ${ing.removable}, ${j})`;
			}
		}
		await changed(tx, actor, 'menu.imported', 'menu', catalog.version, {
			products: catalog.products.length
		});
	};
	await ('begin' in sql ? sql.begin(run) : run(sql as Tx));
	invalidateCatalog();
}
