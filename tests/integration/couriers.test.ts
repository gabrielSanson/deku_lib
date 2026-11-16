// S5.3: own couriers. Deliveries are grouped into a run, the courier's link marks "Saiu" (the
// customer is told) and "Entregue" (the order completes), and settling books the payout as an
// expense that replaces the per-delivery estimate in the month's result.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import {
	addCourier,
	awaitingDispatch,
	courierByToken,
	courierRuns,
	createRun,
	getRun,
	markDelivered,
	markLeft,
	newCourierLink,
	removeFromRun,
	settleRun,
	updateCourier
} from '#lib/server/delivery/couriers.ts';
import { orderProfitDetail } from '#lib/server/analytics/profit.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { getPublicOrder } from '#lib/server/orders/queries.ts';
import { ensureCashOpen, makeStaff } from './helpers.ts';

let manager: Awaited<ReturnType<typeof makeStaff>>;
let courierId: string;
let token: string;

async function deliveryOrder() {
	const o = await createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [
			{ sku: 'BRG-CLASSICO', quantity: 1, options: [{ groupId: 'ponto', sku: 'PONTO-AO' }] }
		] as never,
		fulfillmentType: 'counter',
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		actor: manager
	});
	await db()`update orders set fulfillment_type = 'delivery', fulfillment_provider = 'own_driver'
		where id = ${o.id}`;
	await db()`insert into order_addresses (order_id, recipient, cep, street, number, neighborhood, city, state)
		values (${o.id}, 'Ana', '01310-100', 'Av. Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP')`;
	return o;
}

beforeAll(async () => {
	manager = await makeStaff('admin');
	await ensureCashOpen(manager);
	await db()`update couriers set active = false`;
});

afterAll(async () => {
	await db()`update couriers set active = false`;
	// The payout expense would show in other files' monthly results.
	await db()`delete from expenses e using delivery_runs r where r.expense_id = e.id`;
	await stopBoss();
	await closeDb();
});

describe('courier dispatch', () => {
	it('adds a courier with a private link that can be replaced', async () => {
		const c = await addCourier(
			{ name: 'Beto', phone: '11999990000', payPerDeliveryCents: 700 },
			manager
		);
		courierId = c.id;
		expect((await courierByToken(c.token))?.name).toBe('Beto');
		token = await newCourierLink(c.id, manager);
		expect(await courierByToken(c.token)).toBeNull();
		expect((await courierByToken(token))?.id).toBe(c.id);
		await expect(addCourier({ name: ' ', payPerDeliveryCents: 0 }, manager)).rejects.toThrow();
	});

	it('runs a delivery from dispatch to settlement', async () => {
		const a = await deliveryOrder();
		const b = await deliveryOrder();
		const c = await deliveryOrder();
		const waiting = (await awaitingDispatch()).map((o) => o.id);
		expect(waiting).toEqual(expect.arrayContaining([a.id, b.id, c.id]));

		const runId = await createRun(courierId, [a.id, b.id, c.id], manager);
		await expect(createRun(courierId, [a.id], manager)).rejects.toThrow();
		await removeFromRun(c.id, manager);
		expect((await getRun(runId))!.orders.map((o) => o.id)).toEqual([a.id, b.id]);

		const before = await getPublicOrder(a.publicToken);
		expect(before?.awaitingCourier).toBe(true);
		await expect(markDelivered(a.id, manager, courierId)).rejects.toThrow();

		// Another courier's link cannot touch this run.
		const other = await addCourier({ name: 'Caio', payPerDeliveryCents: 500 }, manager);
		await expect(markLeft(runId, manager, other.id)).rejects.toThrow();

		await markLeft(runId, { type: 'integration', id: null }, courierId);
		const [st] = await db()<{ status: string }[]>`select status from orders where id = ${a.id}`;
		expect(st.status).toBe('ready');
		const out = await getPublicOrder(a.publicToken);
		expect(out?.outAt).not.toBeNull();
		expect(out?.awaitingCourier).toBe(false);
		const [{ n }] = await db()<{ n: number }[]>`
			select count(*)::int as n from pgboss.job where name = 'whatsapp-notify'
				and singleton_key in (${`out:${a.id}`}, ${`out:${b.id}`})`;
		expect(n).toBe(2);
		await expect(removeFromRun(a.id, manager)).rejects.toThrow();

		await markDelivered(a.id, { type: 'integration', id: null }, courierId);
		const [done] = await db()<{ status: string }[]>`select status from orders where id = ${a.id}`;
		expect(done.status).toBe('completed');
		expect((await getRun(runId))!.returnedAt).toBeNull();
		expect((await courierRuns(courierId)).map((r) => r.id)).toContain(runId);

		// Only one of the two was delivered: pays one delivery.
		expect(await settleRun(runId, manager)).toBe(700);
		await expect(settleRun(runId, manager)).rejects.toThrow();
		const [e] = await db()<{ amount: number; category: string }[]>`
			select e.amount_cents as amount, c.name as category from delivery_runs r
			join expenses e on e.id = r.expense_id join expense_categories c on c.id = e.category_id
			where r.id = ${runId}`;
		expect(e).toEqual({ amount: 700, category: 'Entregadores' });
		// The delivered order no longer carries the per-delivery estimate (the payout is an expense).
		const [paid] = await db()<{ n: number }[]>`
			select count(*)::int as n from deliveries d join delivery_runs r on r.id = d.run_id
			where d.order_id = ${a.id} and r.expense_id is not null`;
		expect(paid.n).toBe(1);
		expect((await orderProfitDetail(a.id))?.deliveryCostCents).toBe(0);

		await updateCourier(
			other.id,
			{ name: 'Caio', payPerDeliveryCents: 500, active: false },
			manager
		);
	});
});
