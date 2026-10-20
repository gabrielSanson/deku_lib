import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder, transitionOrder } from '#lib/server/orders/service.ts';
import { getOrderDetail, getPublicOrder, listKitchenOrders } from '#lib/server/orders/queries.ts';
import { recordManualTender, refundTender } from '#lib/server/payments/tenders.ts';
import { setSoldOut, updateStoreSettings } from '#lib/server/settings/service.ts';
import { classic, makeStaff } from './helpers.ts';

let cashier: Awaited<ReturnType<typeof makeStaff>>;
let kitchen: Awaited<ReturnType<typeof makeStaff>>;
let manager: Awaited<ReturnType<typeof makeStaff>>;

beforeAll(async () => {
	cashier = await makeStaff('cashier');
	kitchen = await makeStaff('kitchen');
	manager = await makeStaff('manager');
});

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

function counterOrder(key = randomUUID()) {
	return createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [classic, { sku: 'ACP-FRITAS', quantity: 2 }],
		fulfillmentType: 'counter',
		customerLabel: 'Mesa 4',
		idempotencyKey: key,
		initialStatus: 'confirmed',
		actor: cashier
	});
}

describe('order creation', () => {
	it('snapshots prices and writes history', async () => {
		const order = await counterOrder();
		expect(order.created).toBe(true);
		expect(order.totalCents).toBe(2890 + 2 * 1490);
		const detail = await getOrderDetail(order.id);
		expect(detail?.items).toHaveLength(2);
		expect(detail?.items[0].modifiers[0].optionName).toBe('Ao ponto');
		expect(detail?.history.map((h) => h.toStatus)).toEqual(['confirmed', 'confirmed']);
		expect(detail?.acceptedAt).not.toBeNull();
	});

	it('returns the same order for a repeated idempotency key, even concurrently', async () => {
		const key = randomUUID();
		const [a, b, c] = await Promise.all([counterOrder(key), counterOrder(key), counterOrder(key)]);
		expect(new Set([a.id, b.id, c.id]).size).toBe(1);
		const [{ n }] = await db()<
			{ n: number }[]
		>`select count(*)::int n from orders where idempotency_key = ${key}`;
		expect(n).toBe(1);
	});

	it('enqueues the follow-up job in the same transaction', async () => {
		const order = await counterOrder();
		const jobs = await db()<{ n: number }[]>`
			select count(*)::int n from pgboss.job where name = 'order-placed' and data->>'orderId' = ${order.id}`;
		expect(jobs[0].n).toBe(1);
	});

	it('blocks sold-out products', async () => {
		await setSoldOut('ACP-ONION', true, manager);
		await expect(
			createOrder({
				channel: 'counter',
				sourceMode: 'staff_pos',
				lines: [{ sku: 'ACP-ONION', quantity: 1 }],
				fulfillmentType: 'counter',
				idempotencyKey: randomUUID(),
				actor: cashier
			})
		).rejects.toThrow(/esgotado/);
		await setSoldOut('ACP-ONION', false, manager);
	});

	it('refuses web orders while the store is paused', async () => {
		await updateStoreSettings({ acceptingOrders: false, pauseReason: 'Fechado' }, manager);
		await expect(
			createOrder({
				channel: 'web',
				sourceMode: 'web',
				lines: [classic],
				fulfillmentType: 'pickup',
				idempotencyKey: randomUUID(),
				actor: { type: 'customer', id: null }
			})
		).rejects.toThrow('Fechado');
	});
});

describe('transitions', () => {
	it('moves through the kitchen and ignores repeats', async () => {
		const order = await counterOrder();
		await transitionOrder({ orderId: order.id, to: 'preparing', actor: kitchen });
		const again = await transitionOrder({ orderId: order.id, to: 'preparing', actor: kitchen });
		expect(again.changed).toBe(false);
		await transitionOrder({ orderId: order.id, to: 'ready', actor: kitchen });
		const kds = await listKitchenOrders();
		expect(kds.find((o) => o.id === order.id)?.status).toBe('ready');
		await transitionOrder({ orderId: order.id, to: 'completed', actor: cashier });
		const detail = await getOrderDetail(order.id);
		expect(detail?.history.map((h) => h.toStatus)).toEqual([
			'confirmed',
			'confirmed',
			'preparing',
			'ready',
			'completed'
		]);
	});

	it('enforces roles, reasons and versions', async () => {
		const order = await counterOrder();
		await transitionOrder({ orderId: order.id, to: 'preparing', actor: kitchen });
		await expect(
			transitionOrder({ orderId: order.id, to: 'cancelled', actor: cashier, reason: 'x' })
		).rejects.toThrow(/perfil/);
		await expect(
			transitionOrder({ orderId: order.id, to: 'cancelled', actor: manager })
		).rejects.toThrow(/motivo/);
		await expect(
			transitionOrder({ orderId: order.id, to: 'ready', actor: kitchen, expectedVersion: 1 })
		).rejects.toThrow(/atualizado/);
		const res = await transitionOrder({
			orderId: order.id,
			to: 'cancelled',
			actor: manager,
			reason: 'Cliente desistiu'
		});
		expect(res.changed).toBe(true);
		await expect(
			transitionOrder({ orderId: order.id, to: 'ready', actor: kitchen })
		).rejects.toThrow();
	});
});

describe('tenders', () => {
	it('records cash with change and marks the order paid', async () => {
		const order = await counterOrder();
		const key = randomUUID();
		const res = await recordManualTender({
			orderId: order.id,
			method: 'cash',
			amountCents: order.totalCents,
			cashReceivedCents: 10000,
			idempotencyKey: key,
			actor: cashier
		});
		expect(res.changeCents).toBe(10000 - order.totalCents);
		const dup = await recordManualTender({
			orderId: order.id,
			method: 'cash',
			amountCents: order.totalCents,
			cashReceivedCents: 10000,
			idempotencyKey: key,
			actor: cashier
		});
		expect(dup.duplicate).toBe(true);
		expect((await getOrderDetail(order.id))?.paymentStatus).toBe('paid');
	});

	it('supports split payments and refuses overpayment', async () => {
		const order = await counterOrder();
		await recordManualTender({
			orderId: order.id,
			method: 'terminal_card',
			amountCents: 2000,
			providerReference: 'NSU123',
			idempotencyKey: randomUUID(),
			actor: cashier
		});
		expect((await getOrderDetail(order.id))?.paymentStatus).toBe('pending');
		await expect(
			recordManualTender({
				orderId: order.id,
				method: 'external_pix',
				amountCents: order.totalCents,
				providerReference: 'E123',
				idempotencyKey: randomUUID(),
				actor: cashier
			})
		).rejects.toThrow(/ultrapassa/);
		await expect(
			recordManualTender({
				orderId: order.id,
				method: 'softpos_nfc',
				amountCents: order.totalCents - 2000,
				idempotencyKey: randomUUID(),
				actor: cashier
			})
		).rejects.toThrow(/NSU/);
	});

	it('lets only managers refund', async () => {
		const order = await counterOrder();
		await recordManualTender({
			orderId: order.id,
			method: 'cash',
			amountCents: order.totalCents,
			idempotencyKey: randomUUID(),
			actor: cashier
		});
		const [t] = await db()<{ id: string }[]>`select id from tenders where order_id = ${order.id}`;
		await expect(refundTender(t.id, 'erro', cashier)).rejects.toThrow(/gerente/);
		await refundTender(t.id, 'Cobrado em dobro', manager);
		expect((await getOrderDetail(order.id))?.paymentStatus).toBe('refunded');
	});
});

describe('public order view', () => {
	it('finds orders by token and hides internals', async () => {
		const order = await counterOrder();
		const view = await getPublicOrder(order.publicToken);
		expect(view?.orderNumber).toBe(order.orderNumber);
		expect(view).not.toHaveProperty('history');
		expect(await getPublicOrder('nope')).toBeNull();
	});
});
