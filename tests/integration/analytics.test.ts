import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	overview,
	peakHours,
	previousRange,
	reconciliation,
	resolveRange,
	salesByDay
} from '#lib/server/analytics/queries.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder, transitionOrder } from '#lib/server/orders/service.ts';
import { recordManualTender, refundTender } from '#lib/server/payments/tenders.ts';
import { classic, makeStaff } from './helpers.ts';

let cashier: Awaited<ReturnType<typeof makeStaff>>;
let manager: Awaited<ReturnType<typeof makeStaff>>;

async function orderAt(
	createdAtUtc: string,
	opts: { cancel?: boolean; complete?: boolean; pay?: boolean } = {}
) {
	const o = await createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [classic],
		fulfillmentType: 'counter',
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		actor: cashier
	});
	if (opts.pay) {
		await recordManualTender({
			orderId: o.id,
			method: 'cash',
			amountCents: o.totalCents,
			idempotencyKey: randomUUID(),
			actor: cashier
		});
	}
	if (opts.complete) {
		await transitionOrder({ orderId: o.id, to: 'preparing', actor: cashier });
		await transitionOrder({ orderId: o.id, to: 'ready', actor: cashier });
		await transitionOrder({ orderId: o.id, to: 'completed', actor: cashier });
	}
	if (opts.cancel)
		await transitionOrder({ orderId: o.id, to: 'cancelled', actor: manager, reason: 'teste' });
	const at = new Date(createdAtUtc);
	await db()`
		update orders set created_at = ${at}, accepted_at = ${at},
			ready_at = case when ready_at is null then null else ${new Date(at.getTime() + 12 * 60_000)}::timestamptz end,
			promised_at = ${new Date(at.getTime() + 20 * 60_000)}
		where id = ${o.id}`;
	await db()`update tenders set confirmed_at = ${at}, created_at = ${at} where order_id = ${o.id}`;
	return o;
}

beforeAll(async () => {
	cashier = await makeStaff('cashier');
	manager = await makeStaff('manager');
	// 2025-03-10 local (UTC-3): one order just after midnight, one at 23:30 local (02:30 UTC next day).
	await orderAt('2025-03-10T03:05:00Z', { pay: true, complete: true });
	await orderAt('2025-03-11T02:30:00Z', { pay: true, complete: true });
	await orderAt('2025-03-10T15:00:00Z', { cancel: true });
	// Belongs to 2025-03-11 local.
	await orderAt('2025-03-11T03:10:00Z', { pay: true });
});

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

describe('analytics', () => {
	it('groups by the shop-local day', async () => {
		const day = await overview({ from: '2025-03-10', to: '2025-03-10' });
		expect(day.placed).toBe(3);
		expect(day.cancelled).toBe(1);
		expect(day.completed).toBe(2);
		expect(day.grossCents).toBe(2 * 2890);
		expect(day.collectedCents).toBe(2 * 2890);
		expect(day.aovCents).toBe(2890);
		expect(day.cancellationRate).toBeCloseTo(1 / 3);
		expect(day.prep.n).toBe(2);
		expect(day.prep.medianMin).toBe(12);
		expect(day.onTime).toEqual({ rate: 1, n: 2 });
		const next = await overview({ from: '2025-03-11', to: '2025-03-11' });
		expect(next.placed).toBe(1);
	});

	it('fills empty days in the daily series and counts refunds on their own date', async () => {
		const series = await salesByDay({ from: '2025-03-09', to: '2025-03-11' });
		expect(series.map((s) => s.orders)).toEqual([0, 2, 1]);
		const [t] = await db()<{ id: string }[]>`
			select t.id from tenders t join orders o on o.id = t.order_id
			where o.created_at = '2025-03-11T03:10:00Z'`;
		await refundTender(t.id, 'erro', manager);
		await db()`update tenders set refunded_at = '2025-03-12T15:00:00Z' where id = ${t.id}`;
		const refundDay = await overview({ from: '2025-03-12', to: '2025-03-12' });
		expect(refundDay.refundCents).toBe(2890);
		expect(refundDay.netCents).toBe(-2890);
	});

	it('reports peak hours in local time', async () => {
		const peaks = await peakHours({ from: '2025-03-10', to: '2025-03-10' });
		expect(peaks.map((p) => p.hour).sort((a, b) => a - b)).toEqual([0, 23]);
	});

	it('flags unpaid and cancelled-but-paid orders in reconciliation', async () => {
		const rec = await reconciliation('2025-03-10');
		expect(rec.issues).toHaveLength(0);
		expect(rec.byMethod.find((m) => m.method === 'cash' && m.status === 'paid')?.amountCents).toBe(
			2 * 2890
		);
	});

	it('resolves presets and previous periods', () => {
		const now = new Date('2025-03-11T02:30:00Z'); // 23:30 on the 10th, local
		expect(resolveRange('today', null, null, now)).toEqual({
			from: '2025-03-10',
			to: '2025-03-10'
		});
		expect(resolveRange('7d', null, null, now)).toEqual({ from: '2025-03-04', to: '2025-03-10' });
		expect(resolveRange('month', null, null, now)).toEqual({
			from: '2025-03-01',
			to: '2025-03-10'
		});
		expect(previousRange({ from: '2025-03-04', to: '2025-03-10' })).toEqual({
			from: '2025-02-25',
			to: '2025-03-03'
		});
	});
});
