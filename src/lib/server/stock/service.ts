// Stock and fichas técnicas. A paid order takes its recipe from stock (job stock-deduct); a
// cancel gives it back before the kitchen started, or books it as waste after. Purchases set
// the weighted average cost; counts and waste adjust what is on hand. Stock may go negative.
import {
	averageCostMicro,
	expandRecipe,
	recipeCostCents,
	type RecipeLine,
	type SoldLine
} from '#lib/domain/recipe.ts';
import { randomUUID } from 'node:crypto';
import type { Channel } from '#lib/domain/catalog.ts';
import { priceOnChannel } from '#lib/domain/pricing.ts';
import { audit, type Actor } from '../audit';
import { db, type Db, type Tx } from '../db';
import { loadCatalog } from '../catalog/service';
import { DomainError } from '../errors';

export type BaseUnit = 'g' | 'ml' | 'un';

export interface StockItem {
	id: string;
	name: string;
	baseUnit: BaseUnit;
	onHand: number;
	min: number;
	avgCostMicro: number;
	blocksSale: boolean;
	ingredientId: string | null;
	active: boolean;
}

export async function listStockItems(sql: Db = db(), { all = false } = {}): Promise<StockItem[]> {
	return sql<StockItem[]>`
		select id, name, base_unit as "baseUnit", on_hand_base::float8 as "onHand", min_base::float8 as min,
			avg_cost_micro::float8 as "avgCostMicro", blocks_sale as "blocksSale",
			ingredient_id as "ingredientId", active
		from stock_items where ${all} or active order by lower(name)`;
}

export interface StockItemInput {
	id?: string | null;
	name: string;
	baseUnit: BaseUnit;
	min: number;
	blocksSale: boolean;
	ingredientId: string | null;
	active?: boolean;
}

export async function saveStockItem(input: StockItemInput, actor: Actor) {
	const name = input.name.trim();
	if (!name || name.length > 80) throw new DomainError('err.stock.name');
	if (!['g', 'ml', 'un'].includes(input.baseUnit)) throw new DomainError('err.stock.unit');
	if (!Number.isInteger(input.min) || input.min < 0) throw new DomainError('err.stock.qty');
	return db().begin(async (tx) => {
		const [dupe] = await tx<{ id: string }[]>`
			select id from stock_items where lower(name) = lower(${name})
			and id is distinct from ${input.id ?? null}::uuid`;
		if (dupe) throw new DomainError('err.stock.duplicate');
		const [r] = input.id
			? await tx<{ id: string }[]>`
				update stock_items set name = ${name}, base_unit = ${input.baseUnit}, min_base = ${input.min},
					blocks_sale = ${input.blocksSale}, ingredient_id = ${input.ingredientId},
					active = ${input.active ?? true}
				where id = ${input.id} returning id`
			: await tx<{ id: string }[]>`
				insert into stock_items (name, base_unit, min_base, blocks_sale, ingredient_id)
				values (${name}, ${input.baseUnit}, ${input.min}, ${input.blocksSale}, ${input.ingredientId})
				returning id`;
		if (!r) throw new DomainError('err.stock.notFound');
		await audit(tx, actor, 'stock.item_saved', 'stock_item', r.id, { name });
		return r.id;
	});
}

export async function loadRecipes(sql: Db = db()): Promise<RecipeLine[]> {
	return sql<RecipeLine[]>`
		select product_sku as "productSku", option_sku as "optionSku", stock_item_id as "stockItemId",
			qty_base as "qtyBase", ingredient_id as "ingredientId"
		from recipe_lines`;
}

export interface RecipeLineInput {
	stockItemId: string;
	qtyBase: number;
	ingredientId?: string | null;
}

/** Replaces the ficha técnica of one product or one add-on option. */
export async function saveRecipe(
	target: { productSku: string } | { optionSku: string },
	lines: RecipeLineInput[],
	actor: Actor
) {
	for (const l of lines)
		if (!Number.isInteger(l.qtyBase) || l.qtyBase <= 0) throw new DomainError('err.stock.qty');
	const productSku = 'productSku' in target ? target.productSku : null;
	const optionSku = 'optionSku' in target ? target.optionSku : null;
	await db().begin(async (tx) => {
		await tx`delete from recipe_lines where product_sku is not distinct from ${productSku}
			and option_sku is not distinct from ${optionSku}`;
		for (const l of lines)
			await tx`insert into recipe_lines (product_sku, option_sku, stock_item_id, qty_base, ingredient_id)
				values (${productSku}, ${optionSku}, ${l.stockItemId}, ${l.qtyBase},
					${productSku ? (l.ingredientId ?? null) : null})`;
		await audit(tx, actor, 'stock.recipe_saved', 'recipe', productSku ?? optionSku ?? '', {
			lines: lines.length
		});
	});
}

/** The order's lines as the recipe sees them. */
async function soldLines(tx: Db, orderId: string): Promise<SoldLine[]> {
	const items = await tx<{ id: string; product_sku: string; quantity: number }[]>`
		select id, product_sku, quantity from order_items where order_id = ${orderId} order by position`;
	const mods = await tx<
		{
			order_item_id: string;
			option_sku: string | null;
			quantity: number;
			kind: string;
			ingredient_id: string | null;
		}[]
	>`select m.order_item_id, m.option_sku, m.quantity, m.kind, m.ingredient_id
		from order_item_modifiers m join order_items i on i.id = m.order_item_id
		where i.order_id = ${orderId}`;
	return items.map((i) => {
		const own = mods.filter((m) => m.order_item_id === i.id);
		return {
			productSku: i.product_sku,
			quantity: i.quantity,
			options: own
				.filter((m) => m.kind === 'add' && m.option_sku)
				.map((m) => ({ sku: m.option_sku!, quantity: m.quantity })),
			removed: own
				.filter((m) => m.kind === 'remove' && m.ingredient_id)
				.map((m) => m.ingredient_id!)
		};
	});
}

/** Stock used by an order and how many of its lines have no recipe. */
export async function orderUsage(tx: Db, orderId: string, recipes?: RecipeLine[]) {
	const all = recipes ?? (await loadRecipes(tx));
	const usage = new Map<string, number>();
	let missing = 0;
	for (const line of await soldLines(tx, orderId)) {
		const u = expandRecipe(line, all);
		if (!u) {
			missing++;
			continue;
		}
		for (const [id, q] of u) usage.set(id, (usage.get(id) ?? 0) + q);
	}
	return { usage, missing };
}

async function costs(tx: Db): Promise<Map<string, number>> {
	const rows = await tx<{ id: string; c: number }[]>`
		select id, avg_cost_micro::float8 as c from stock_items`;
	return new Map(rows.map((r) => [r.id, r.c]));
}

/**
 * Food cost of an order in centavos: the cost booked when stock was taken, else today's recipe
 * cost. Null when any line has no recipe ("sem ficha técnica"), never zero.
 */
export async function orderFoodCost(orderId: string, sql: Db = db()): Promise<number | null> {
	const [booked] = await sql<{ n: number; micro: number }[]>`
		select count(*)::int as n,
			coalesce(sum(-qty_base * unit_cost_micro) filter (where kind = 'sale'), 0)::float8 as micro
		from stock_movements where source = 'order' and source_id = ${orderId} and kind = 'sale'`;
	const { usage, missing } = await orderUsage(sql, orderId);
	if (missing > 0) return null;
	if (booked.n > 0) return Math.round(booked.micro / 1_000_000);
	return recipeCostCents(usage, await costs(sql));
}

async function move(
	tx: Tx,
	m: {
		itemId: string;
		kind: 'sale' | 'sale_reversal' | 'purchase' | 'count_adjust' | 'waste';
		qty: number;
		unitCostMicro: number;
		source: string;
		sourceId: string;
		reason?: string | null;
		by?: string | null;
	}
): Promise<boolean> {
	const [r] = await tx<{ id: string }[]>`
		insert into stock_movements (stock_item_id, kind, qty_base, unit_cost_micro, source, source_id,
			reason, created_by)
		values (${m.itemId}, ${m.kind}, ${m.qty}, ${m.unitCostMicro}, ${m.source}, ${m.sourceId},
			${m.reason ?? null}, ${m.by ?? null})
		on conflict (shop_id, source, source_id, stock_item_id, kind) do nothing returning id`;
	if (!r) return false;
	await tx`update stock_items set on_hand_base = on_hand_base + ${m.qty} where id = ${m.itemId}`;
	return true;
}

/** Items that block sales and ran out: their ingredient goes sold out. */
async function blockEmpty(tx: Tx) {
	await tx`update menu_ingredients i set available = false, unavailable_at = now()
		from stock_items s
		where s.ingredient_id = i.id and s.shop_id = i.shop_id and s.blocks_sale and s.active
			and s.on_hand_base <= 0 and i.available`;
}

/** Job stock-deduct: a paid, confirmed order takes its recipe from stock, once. */
export async function deductStock(orderId: string) {
	return db().begin(async (tx) => {
		const [o] = await tx<{ status: string; is_test: boolean }[]>`
			select status, is_test from orders where id = ${orderId} for update`;
		if (!o || o.is_test || ['new', 'cancelled', 'rejected'].includes(o.status)) return 'skipped';
		const { usage } = await orderUsage(tx, orderId);
		if (usage.size === 0) return 'skipped';
		const cost = await costs(tx);
		for (const [itemId, qty] of usage)
			await move(tx, {
				itemId,
				kind: 'sale',
				qty: -qty,
				unitCostMicro: cost.get(itemId) ?? 0,
				source: 'order',
				sourceId: orderId
			});
		await blockEmpty(tx);
		return 'deducted';
	});
}

/**
 * Job stock-reverse, on cancel: before the kitchen started the stock comes back; after, the
 * food is gone, so the sale is reversed and booked as waste (on hand stays the same).
 */
export async function reverseStock(orderId: string) {
	return db().begin(async (tx) => {
		await tx`select id from orders where id = ${orderId} for update`;
		const sales = await tx<{ stock_item_id: string; qty: number; unit_cost_micro: number }[]>`
			select stock_item_id, (-qty_base)::float8 as qty, unit_cost_micro::float8 as unit_cost_micro
			from stock_movements where source = 'order' and source_id = ${orderId} and kind = 'sale'`;
		if (sales.length === 0) return 'skipped';
		const [h] = await tx<{ started: boolean }[]>`
			select exists (select 1 from order_status_history where order_id = ${orderId}
				and to_status = 'preparing') as started`;
		for (const s of sales) {
			await move(tx, {
				itemId: s.stock_item_id,
				kind: 'sale_reversal',
				qty: s.qty,
				unitCostMicro: s.unit_cost_micro,
				source: 'order',
				sourceId: orderId
			});
			if (h.started)
				await move(tx, {
					itemId: s.stock_item_id,
					kind: 'waste',
					qty: -s.qty,
					unitCostMicro: s.unit_cost_micro,
					source: 'order',
					sourceId: orderId,
					reason: 'cancelado após preparo'
				});
		}
		return h.started ? 'waste' : 'reversed';
	});
}

export interface PurchaseInput {
	supplier?: string | null;
	purchasedOn?: string | null;
	lines: { stockItemId: string; qtyBase: number; totalCents: number }[];
}

export async function recordPurchase(input: PurchaseInput, actor: Actor) {
	const lines = input.lines.filter((l) => l.qtyBase > 0);
	if (lines.length === 0) throw new DomainError('err.stock.noLines');
	for (const l of lines)
		if (!Number.isInteger(l.qtyBase) || !Number.isInteger(l.totalCents) || l.totalCents < 0)
			throw new DomainError('err.stock.qty');
	return db().begin(async (tx) => {
		const total = lines.reduce((n, l) => n + l.totalCents, 0);
		const [p] = await tx<{ id: string }[]>`
			insert into purchases (supplier, purchased_on, total_cents, created_by)
			values (${input.supplier?.trim() || null}, ${input.purchasedOn || new Date().toISOString().slice(0, 10)},
				${total}, ${actor.id}) returning id`;
		for (const [i, l] of lines.entries()) {
			const [item] = await tx<{ on_hand: number; avg: number }[]>`
				select on_hand_base::float8 as on_hand, avg_cost_micro::float8 as avg from stock_items
				where id = ${l.stockItemId} for update`;
			if (!item) throw new DomainError('err.stock.notFound');
			await tx`insert into purchase_lines (purchase_id, stock_item_id, qty_base, total_cents)
				values (${p.id}, ${l.stockItemId}, ${l.qtyBase}, ${l.totalCents})`;
			const avg = averageCostMicro(item.on_hand, item.avg, l.qtyBase, l.totalCents);
			await tx`update stock_items set avg_cost_micro = ${avg} where id = ${l.stockItemId}`;
			await move(tx, {
				itemId: l.stockItemId,
				kind: 'purchase',
				qty: l.qtyBase,
				unitCostMicro: Math.round((l.totalCents * 1_000_000) / l.qtyBase),
				source: 'purchase',
				sourceId: `${p.id}:${i}`,
				by: actor.id
			});
		}
		await audit(tx, actor, 'stock.purchase', 'purchase', p.id, { total });
		return p.id;
	});
}

/** A count: each item counted sets on hand to what was found. */
export async function recordCount(
	counts: { stockItemId: string; counted: number }[],
	actor: Actor
) {
	const id = randomUUID();
	return db().begin(async (tx) => {
		let changed = 0;
		for (const c of counts) {
			if (!Number.isInteger(c.counted) || c.counted < 0) throw new DomainError('err.stock.qty');
			const [item] = await tx<{ on_hand: number; avg: number }[]>`
				select on_hand_base::float8 as on_hand, avg_cost_micro::float8 as avg from stock_items
				where id = ${c.stockItemId} for update`;
			if (!item || item.on_hand === c.counted) continue;
			await move(tx, {
				itemId: c.stockItemId,
				kind: 'count_adjust',
				qty: c.counted - item.on_hand,
				unitCostMicro: item.avg,
				source: 'count',
				sourceId: id,
				by: actor.id
			});
			changed++;
		}
		await blockEmpty(tx);
		await audit(tx, actor, 'stock.count', 'stock_count', id, { changed });
		return changed;
	});
}

export async function recordWaste(stockItemId: string, qty: number, reason: string, actor: Actor) {
	if (!Number.isInteger(qty) || qty <= 0) throw new DomainError('err.stock.qty');
	return db().begin(async (tx) => {
		const [item] = await tx<{ avg: number }[]>`
			select avg_cost_micro::float8 as avg from stock_items where id = ${stockItemId}`;
		if (!item) throw new DomainError('err.stock.notFound');
		const id = randomUUID();
		await move(tx, {
			itemId: stockItemId,
			kind: 'waste',
			qty: -qty,
			unitCostMicro: item.avg,
			source: 'waste',
			sourceId: id,
			reason: reason.trim().slice(0, 200) || null,
			by: actor.id
		});
		await blockEmpty(tx);
		await audit(tx, actor, 'stock.waste', 'stock_item', stockItemId, { qty });
	});
}

export async function recentMovements(kinds: string[], limit = 50) {
	return db()<
		{
			id: string;
			item: string;
			baseUnit: BaseUnit;
			kind: string;
			qty: number;
			unitCostMicro: number;
			reason: string | null;
			createdAt: Date;
		}[]
	>`
		select m.id, s.name as item, s.base_unit as "baseUnit", m.kind, m.qty_base::float8 as qty,
			m.unit_cost_micro::float8 as "unitCostMicro", m.reason, m.created_at as "createdAt"
		from stock_movements m join stock_items s on s.id = m.stock_item_id
		where m.kind = any(${kinds}) order by m.created_at desc limit ${limit}`;
}

export async function recentPurchases(limit = 30) {
	return db()<
		{ id: string; supplier: string | null; purchasedOn: Date; totalCents: number; lines: number }[]
	>`
		select p.id, p.supplier, p.purchased_on as "purchasedOn", p.total_cents as "totalCents",
			(select count(*)::int from purchase_lines l where l.purchase_id = p.id) as lines
		from purchases p order by p.purchased_on desc, p.created_at desc limit ${limit}`;
}

/** Items at or under their minimum, for the staff home. */
export async function lowStock(sql: Db = db()) {
	return sql<{ id: string; name: string; baseUnit: BaseUnit; onHand: number; min: number }[]>`
		select id, name, base_unit as "baseUnit", on_hand_base::float8 as "onHand", min_base::float8 as min
		from stock_items where active and (on_hand_base <= min_base and (min_base > 0 or blocks_sale))
		order by on_hand_base - min_base limit 10`;
}

const CHANNELS: Channel[] = ['counter', 'web', 'ifood'];

/** Every product and add-on with its recipe cost (null = sem ficha técnica) and channel prices. */
export async function recipeOverview() {
	const sql = db();
	const [catalog, recipes] = await Promise.all([loadCatalog(sql), loadRecipes(sql)]);
	const cost = await costs(sql);
	const costOf = (usage: Map<string, number> | null) =>
		usage ? recipeCostCents(usage, cost) : null;
	const products = catalog.products.map((p) => ({
		sku: p.sku,
		name: p.name,
		costCents: costOf(
			expandRecipe({ productSku: p.sku, quantity: 1, options: [], removed: [] }, recipes)
		),
		prices: Object.fromEntries(CHANNELS.map((c) => [c, priceOnChannel(catalog, p, c)])) as Record<
			Channel,
			number
		>
	}));
	const seen = new Set<string>();
	const options: { sku: string; name: string; costCents: number | null; priceCents: number }[] = [];
	for (const p of catalog.products)
		for (const g of p.modifierGroups)
			for (const o of g.options) {
				if (seen.has(o.sku)) continue;
				seen.add(o.sku);
				const lines = recipes.filter((r) => r.optionSku === o.sku);
				options.push({
					sku: o.sku,
					name: o.name,
					costCents: lines.length
						? recipeCostCents(new Map(lines.map((l) => [l.stockItemId, l.qtyBase])), cost)
						: null,
					priceCents: o.priceCents
				});
			}
	return { products, options };
}

/** The ficha técnica of one product or option, for its editor. */
export async function recipeFor(kind: 'product' | 'option', sku: string) {
	const sql = db();
	const catalog = await loadCatalog(sql);
	const product = kind === 'product' ? catalog.products.find((p) => p.sku === sku) : undefined;
	const option =
		kind === 'option'
			? catalog.products
					.flatMap((p) => p.modifierGroups.flatMap((g) => g.options))
					.find((o) => o.sku === sku)
			: undefined;
	if (!product && !option) return null;
	const lines = await sql<{ stockItemId: string; qtyBase: number; ingredientId: string | null }[]>`
		select stock_item_id as "stockItemId", qty_base as "qtyBase", ingredient_id as "ingredientId"
		from recipe_lines where ${kind === 'product' ? sql`product_sku` : sql`option_sku`} = ${sku}
		order by id`;
	return {
		kind,
		sku,
		name: (product ?? option)!.name,
		ingredients: product?.ingredients.map((i) => ({ id: i.id, name: i.name })) ?? [],
		prices: product
			? (Object.fromEntries(
					CHANNELS.map((c) => [c, priceOnChannel(catalog, product, c)])
				) as Record<Channel, number>)
			: ({
					counter: option!.priceCents,
					web: option!.priceCents,
					ifood: option!.priceCents
				} as Record<Channel, number>),
		lines
	};
}
