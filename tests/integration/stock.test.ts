// S4.1: a paid order takes its ficha técnica from stock once; a cancel gives it back before the
// kitchen started and books waste after; purchases set the average cost; a product without a
// recipe has no food cost (never zero).
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder, transitionOrder } from '#lib/server/orders/service.ts';
import {
	deductStock,
	orderFoodCost,
	recordCount,
	recordPurchase,
	recordWaste,
	reverseStock,
	saveRecipe,
	saveStockItem
} from '#lib/server/stock/service.ts';
import { ensureCashOpen, makeStaff } from './helpers.ts';

let manager: Awaited<ReturnType<typeof makeStaff>>;
const tag = randomUUID().slice(0, 6);
let carne: string, tomate: string, bacon: string;

const onHand = async (id: string) => {
	const [r] = await db()<{ n: number; avg: number }[]>`
		select on_hand_base::float8 as n, avg_cost_micro::float8 as avg from stock_items where id = ${id}`;
	return r;
};

function order(lines: unknown[]) {
	return createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: lines as never,
		fulfillmentType: 'counter',
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		actor: manager
	});
}

const burger = (extra: { groupId: string; sku: string }[] = []) => ({
	sku: 'BRG-CLASSICO',
	quantity: 2,
	options: [{ groupId: 'ponto', sku: 'PONTO-AO' }, ...extra]
});

beforeAll(async () => {
	manager = await makeStaff('admin');
	await ensureCashOpen(manager);
	const item = (
		name: string,
		unit: 'g' | 'un',
		blocksSale = false,
		ingredientId: string | null = null
	) =>
		saveStockItem(
			{ name: `${name} ${tag}`, baseUnit: unit, min: 0, blocksSale, ingredientId },
			manager
		);
	carne = await item('Carne', 'g');
	tomate = await item('Tomate', 'g', true, 'tomate');
	bacon = await item('Bacon', 'g');
	// Carne R$40/kg, tomate R$10/kg, bacon R$60/kg.
	await recordPurchase(
		{
			supplier: 'Atacado',
			lines: [
				{ stockItemId: carne, qtyBase: 10_000, totalCents: 40_000 },
				{ stockItemId: tomate, qtyBase: 100, totalCents: 100 },
				{ stockItemId: bacon, qtyBase: 1_000, totalCents: 6_000 }
			]
		},
		manager
	);
	await saveRecipe(
		{ productSku: 'BRG-CLASSICO' },
		[
			{ stockItemId: carne, qtyBase: 150 },
			{ stockItemId: tomate, qtyBase: 30, ingredientId: 'tomate' }
		],
		manager
	);
	await saveRecipe({ optionSku: 'ADD-BACON' }, [{ stockItemId: bacon, qtyBase: 30 }], manager);
});

afterAll(async () => {
	await db()`delete from recipe_lines`;
	await db()`update menu_ingredients set available = true, unavailable_at = null`;
	await stopBoss();
	await closeDb();
});

describe('stock', () => {
	it('takes the recipe once, with options and removals, and costs it', async () => {
		const o = await order([burger([{ groupId: 'adicionais', sku: 'ADD-BACON' }])]);
		expect(await deductStock(o.id)).toBe('deducted');
		expect(await deductStock(o.id)).toBe('deducted');
		expect((await onHand(carne)).n).toBe(10_000 - 300);
		expect((await onHand(bacon)).n).toBe(1_000 - 60);
		expect((await onHand(tomate)).n).toBe(100 - 60);
		// 300 g × 4 c + 60 g × 1 c + 60 g × 6 c = 1200 + 60 + 360.
		expect(await orderFoodCost(o.id)).toBe(1620);

		const [movements] = await db()<{ n: number }[]>`
			select count(*)::int as n from stock_movements where source_id = ${o.id}`;
		expect(movements.n).toBe(3);

		const without = await order([burger([{ groupId: '_sem', sku: 'tomate' }])]);
		await deductStock(without.id);
		expect((await onHand(tomate)).n).toBe(40);
	});

	it('marks the ingredient sold out when a blocking item runs out', async () => {
		const o = await order([burger()]);
		await deductStock(o.id);
		expect((await onHand(tomate)).n).toBe(-20);
		const [ing] = await db()<{ available: boolean }[]>`
			select available from menu_ingredients where id = 'tomate'`;
		expect(ing.available).toBe(false);
		await recordCount([{ stockItemId: tomate, counted: 500 }], manager);
		expect((await onHand(tomate)).n).toBe(500);
		await db()`update menu_ingredients set available = true where id = 'tomate'`;
	});

	it('gives stock back on an early cancel and books waste after the kitchen started', async () => {
		const early = await order([burger()]);
		await deductStock(early.id);
		const before = (await onHand(carne)).n;
		await transitionOrder({ orderId: early.id, to: 'cancelled', actor: manager, reason: 'teste' });
		expect(await reverseStock(early.id)).toBe('reversed');
		expect((await onHand(carne)).n).toBe(before + 300);

		const late = await order([burger()]);
		await deductStock(late.id);
		const mid = (await onHand(carne)).n;
		await transitionOrder({ orderId: late.id, to: 'preparing', actor: manager });
		await transitionOrder({ orderId: late.id, to: 'cancelled', actor: manager, reason: 'teste' });
		expect(await reverseStock(late.id)).toBe('waste');
		expect(await reverseStock(late.id)).toBe('waste');
		expect((await onHand(carne)).n).toBe(mid);
		const [w] = await db()<{ n: number }[]>`
			select count(*)::int as n from stock_movements where source_id = ${late.id} and kind = 'waste'`;
		expect(w.n).toBe(2);
	});

	it('averages cost on purchase and books waste at that cost', async () => {
		const start = await onHand(bacon);
		await recordPurchase(
			{ lines: [{ stockItemId: bacon, qtyBase: start.n, totalCents: Math.round(start.n * 8) }] },
			manager
		);
		// Half at 6 c/g, half at 8 c/g → 7 c/g.
		expect((await onHand(bacon)).avg).toBe(7_000_000);
		await recordWaste(bacon, 10, 'caiu no chão', manager);
		expect((await onHand(bacon)).n).toBe(start.n * 2 - 10);
	});

	it('reports no food cost for a product without a recipe', async () => {
		const o = await order([{ sku: 'ACP-FRITAS', quantity: 1, options: [] }]);
		expect(await deductStock(o.id)).toBe('skipped');
		expect(await orderFoodCost(o.id)).toBeNull();
	});
});
