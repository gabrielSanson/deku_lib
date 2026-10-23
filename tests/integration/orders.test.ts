import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { callOrder, createOrder, transitionOrder } from '#lib/server/orders/service.ts';
import {
	getOrderDetail,
	getPublicOrder,
	listBoardOrders,
	listKitchenOrders
} from '#lib/server/orders/queries.ts';
import { recordManualTender, refundTender } from '#lib/server/payments/tenders.ts';
import { setSoldOut, updateStoreSettings } from '#lib/server/settings/service.ts';
import { classic, ensureCashOpen, makeStaff } from './helpers.ts';

let cashier: Awaited<ReturnType<typeof makeStaff>>;
let kitchen: Awaited<ReturnType<typeof makeStaff>>;
let manager: Awaited<ReturnType<typeof makeStaff>>;

beforeAll(async () => {
	cashier = await makeStaff('admin');
	kitchen = await makeStaff('kitchen');
	manager = await makeStaff('admin');
	await ensureCashOpen(cashier);
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
			transitionOrder({ orderId: order.id, to: 'cancelled', actor: kitchen, reason: 'x' })
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
		await expect(refundTender(t.id, 'erro', kitchen)).rejects.toThrow(/admin/);
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

describe('ingredients', () => {
	it('stores removed ingredients and enforces ones that ran out', async () => {
		const { setIngredientAvailable } = await import('#lib/server/catalog/editor.ts');
		await setIngredientAvailable('tomate', false, manager);
		try {
			await expect(counterOrder()).rejects.toThrow('Tomate acabou');
			const order = await createOrder({
				channel: 'counter',
				sourceMode: 'staff_pos',
				lines: [{ ...classic, options: [...classic.options, { groupId: '_sem', sku: 'tomate' }] }],
				fulfillmentType: 'counter',
				idempotencyKey: randomUUID(),
				initialStatus: 'confirmed',
				actor: cashier
			});
			const rows = await db()<{ option_sku: string | null; option_name: string }[]>`
				select m.option_sku, m.option_name from order_item_modifiers m
				join order_items i on i.id = m.order_item_id where i.order_id = ${order.id}
				and m.group_name = 'Retirar'`;
			expect(rows).toEqual([{ option_sku: null, option_name: 'Sem tomate' }]);
		} finally {
			await setIngredientAvailable('tomate', true, manager);
		}
	});
});

describe('dine-in', () => {
	it('takes table orders from the site only when eating in is switched on', async () => {
		await updateStoreSettings(
			{ acceptingOrders: true, webOrderingEnabled: true, dineInEnabled: false },
			manager
		);
		const webOrder = () =>
			createOrder({
				channel: 'web',
				sourceMode: 'web',
				lines: [classic],
				fulfillmentType: 'dine_in',
				tableLabel: '7',
				customer: { name: 'Ana', phoneE164: '+5511988887777' },
				idempotencyKey: randomUUID(),
				paymentPlan: 'pix_key',
				actor: { type: 'customer', id: null }
			});
		await expect(webOrder()).rejects.toThrow(/comer no local/);
		await updateStoreSettings({ dineInEnabled: true }, manager);
		const order = await webOrder();
		const detail = await getOrderDetail(order.id);
		expect(detail?.fulfillmentType).toBe('dine_in');
		expect(detail?.tableLabel).toBe('7');
	});
});

describe('opening hours', () => {
	it('refuses web orders outside the schedule and accepts them inside', async () => {
		const { saveSchedule } = await import('#lib/server/settings/hours.ts');
		await updateStoreSettings(
			{ acceptingOrders: true, webOrderingEnabled: true, pickupEnabled: true },
			manager
		);
		const webOrder = () =>
			createOrder({
				channel: 'web',
				sourceMode: 'web',
				lines: [classic],
				fulfillmentType: 'pickup',
				customer: { name: 'Bia', phoneE164: '+5511977776666' },
				idempotencyKey: randomUUID(),
				paymentPlan: 'pix_key',
				actor: { type: 'customer', id: null }
			});
		try {
			// Open every day, but today is a closed date.
			const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
				new Date()
			);
			const allDay = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
				weekday,
				opens: '00:00',
				closes: '00:00'
			}));
			await saveSchedule({ enabled: true, days: allDay, closures: [{ day: today }] }, manager);
			await expect(webOrder()).rejects.toThrow(/horário/);
			await saveSchedule({ enabled: true, days: allDay, closures: [] }, manager);
			await expect(webOrder()).resolves.toHaveProperty('id');
		} finally {
			await saveSchedule({ enabled: false, days: [], closures: [] }, manager);
		}
	});
});

describe('paid before the kitchen', () => {
	it('keeps a counter sale out of the kitchen until it is fully paid', async () => {
		const order = await createOrder({
			channel: 'counter',
			sourceMode: 'staff_pos',
			lines: [classic, { sku: 'ACP-FRITAS', quantity: 2 }],
			fulfillmentType: 'counter',
			customerLabel: 'Ana',
			idempotencyKey: randomUUID(),
			actor: cashier
		});
		expect(order.status).toBe('new');
		expect((await listKitchenOrders()).some((o) => o.id === order.id)).toBe(false);

		const pay = (amountCents: number) =>
			recordManualTender({
				orderId: order.id,
				method: 'cash',
				amountCents,
				idempotencyKey: randomUUID(),
				actor: cashier
			});
		await pay(2000);
		expect((await getOrderDetail(order.id))?.status).toBe('new');
		await pay(order.totalCents - 2000);
		const detail = await getOrderDetail(order.id);
		expect(detail?.status).toBe('confirmed');
		expect(detail?.paymentStatus).toBe('paid');
		expect((await listKitchenOrders()).some((o) => o.id === order.id)).toBe(true);
	});

	it('sends a site order paid by Pix to the shop key to the kitchen when staff register it', async () => {
		await updateStoreSettings(
			{ acceptingOrders: true, webOrderingEnabled: true, pickupEnabled: true },
			manager
		);
		const order = await createOrder({
			channel: 'web',
			sourceMode: 'web',
			lines: [classic],
			fulfillmentType: 'pickup',
			customer: { name: 'Caio', phoneE164: '+5511966665555' },
			idempotencyKey: randomUUID(),
			paymentPlan: 'pix_key',
			actor: { type: 'customer', id: null }
		});
		expect(order.status).toBe('new');
		await recordManualTender({
			orderId: order.id,
			method: 'external_pix',
			amountCents: order.totalCents,
			providerReference: 'E2E123',
			idempotencyKey: randomUUID(),
			actor: cashier
		});
		expect((await getOrderDetail(order.id))?.status).toBe('confirmed');
	});

	it('sends a counter sale with nothing to pay straight to the kitchen', async () => {
		const order = await createOrder({
			channel: 'counter',
			sourceMode: 'staff_pos',
			lines: [classic],
			fulfillmentType: 'counter',
			discountCents: 99_999,
			idempotencyKey: randomUUID(),
			actor: cashier
		});
		expect(order.totalCents).toBe(0);
		expect(order.status).toBe('confirmed');
		expect((await getOrderDetail(order.id))?.paymentStatus).toBe('paid');
	});
});

describe('calling a ready order', () => {
	it('records each call and only works once the order is ready', async () => {
		const order = await counterOrder();
		await expect(callOrder(order.id, cashier)).rejects.toThrow(/prontos/);
		await transitionOrder({ orderId: order.id, to: 'preparing', actor: kitchen });
		await transitionOrder({ orderId: order.id, to: 'ready', actor: kitchen });
		const first = await callOrder(order.id, cashier);
		const second = await callOrder(order.id, kitchen);
		expect(first.count).toBe(1);
		expect(second.count).toBe(2);
		const kds = await listKitchenOrders();
		expect(kds.find((o) => o.id === order.id)?.calledAt).toEqual(second.calledAt);
	});

	it('keeps the table and the customer for an attendant dine-in order', async () => {
		const order = await createOrder({
			channel: 'counter',
			sourceMode: 'staff_pos',
			lines: [classic],
			fulfillmentType: 'dine_in',
			customerLabel: 'Ana',
			tableLabel: '7',
			customer: { name: 'Ana', phoneE164: '+5511955554444' },
			idempotencyKey: randomUUID(),
			actor: cashier
		});
		const detail = await getOrderDetail(order.id);
		expect(detail?.fulfillmentType).toBe('dine_in');
		expect(detail?.tableLabel).toBe('7');
		expect(detail?.customerLabel).toBe('Ana');
	});
});

describe('room board', () => {
	it('shows codes of counter orders by stage and leaves delivery out', async () => {
		const o = await counterOrder();
		await recordManualTender({
			orderId: o.id,
			method: 'terminal_card',
			amountCents: o.totalCents,
			providerReference: 'NSU-BOARD',
			idempotencyKey: randomUUID(),
			actor: cashier
		});
		let board = await listBoardOrders();
		expect(board.find((b) => b.code === String(o.orderNumber))).toMatchObject({
			status: 'preparing',
			alertKey: null
		});
		await transitionOrder({ orderId: o.id, to: 'preparing', actor: kitchen });
		await transitionOrder({ orderId: o.id, to: 'ready', actor: kitchen });
		board = await listBoardOrders();
		const ready = board.find((b) => b.code === String(o.orderNumber));
		expect(ready?.status).toBe('ready');
		expect(ready?.alertKey).toBeTruthy();
		await db()`update orders set fulfillment_type = 'delivery' where id = ${o.id}`;
		board = await listBoardOrders();
		expect(board.find((b) => b.code === String(o.orderNumber))).toBeUndefined();
	});
});
