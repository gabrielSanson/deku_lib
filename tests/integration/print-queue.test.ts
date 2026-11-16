// S5.1: kitchen tickets through the server queue. Two screens claiming at once never get the
// same ticket; an unconfirmed claim goes back after 60 s and fails after 3 tries; reprints are
// extra jobs and nothing is queued while no screen prints.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder, transitionOrder } from '#lib/server/orders/service.ts';
import {
	ackJob,
	claimJob,
	pairStation,
	printStatus,
	reprint,
	stationByToken,
	unpairStation,
	type Station
} from '#lib/server/printing/queue.ts';
import { ensureCashOpen, makeStaff } from './helpers.ts';

let manager: Awaited<ReturnType<typeof makeStaff>>;
let a: Station, b: Station;
let pairedIds: string[] = [];

function order(initialStatus: 'confirmed' | 'new' = 'confirmed') {
	return createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [
			{ sku: 'BRG-CLASSICO', quantity: 1, options: [{ groupId: 'ponto', sku: 'PONTO-AO' }] }
		] as never,
		fulfillmentType: 'counter',
		idempotencyKey: randomUUID(),
		initialStatus,
		actor: manager
	});
}

const clearQueue = () =>
	db()`update print_jobs set status = 'printed' where status in ('queued', 'claimed')`;

beforeAll(async () => {
	manager = await makeStaff('admin');
	await ensureCashOpen(manager);
	await db()`delete from print_stations`;
});

afterAll(async () => {
	for (const id of pairedIds) await unpairStation(id, manager);
	await stopBoss();
	await closeDb();
});

describe('print queue', () => {
	it('queues nothing while no screen prints', async () => {
		const o = await order();
		expect(await printStatus(o.id)).toEqual([]);
	});

	it('pairs screens by a token cookie', async () => {
		const p1 = await pairStation('Cozinha 1', ['kitchen'], manager);
		const p2 = await pairStation('Cozinha 2', ['kitchen'], manager);
		pairedIds = [p1.id, p2.id];
		a = (await stationByToken(p1.token))!;
		b = (await stationByToken(p2.token))!;
		expect(a.name).toBe('Cozinha 1');
		expect(await stationByToken('f'.repeat(64))).toBeNull();
		expect(await stationByToken('not-a-token')).toBeNull();
		await expect(pairStation('x', [], manager)).rejects.toThrow();
	});

	it('two screens claiming together never print the same ticket', async () => {
		await clearQueue();
		const orders = await Promise.all(Array.from({ length: 6 }, () => order()));
		const claims = await Promise.all(Array.from({ length: 12 }, (_, i) => claimJob(i % 2 ? a : b)));
		const got = claims.filter((c) => c != null);
		expect(got).toHaveLength(6);
		expect(new Set(got.map((c) => c.id)).size).toBe(6);
		expect(new Set(got.map((c) => c.orderId))).toEqual(new Set(orders.map((o) => o.id)));
		await clearQueue();
	});

	it('one automatic ticket per order, queued when it is confirmed', async () => {
		await clearQueue();
		const o = await order('new');
		expect(await printStatus(o.id)).toEqual([]);
		// Paid at the counter, then sent to the kitchen.
		await db()`update orders set payment_status = 'paid' where id = ${o.id}`;
		await transitionOrder({ orderId: o.id, to: 'confirmed', actor: manager });
		const [s] = await printStatus(o.id);
		expect(s).toMatchObject({ kind: 'kitchen', status: 'queued' });
		const [{ n }] = await db()<{ n: number }[]>`
			select count(*)::int as n from print_jobs where order_id = ${o.id}`;
		expect(n).toBe(1);
		await clearQueue();
	});

	it('acknowledged jobs are printed; only the claiming screen can confirm', async () => {
		await clearQueue();
		const o = await order();
		const job = (await claimJob(a))!;
		expect(job.orderId).toBe(o.id);
		expect(await ackJob(b, job.id, true)).toBe(false);
		expect(await ackJob(a, job.id, true)).toBe(true);
		expect((await printStatus(o.id))[0].status).toBe('printed');
		expect(await claimJob(a)).toBeNull();
	});

	it('an unconfirmed claim goes back after 60 s and fails after 3 tries', async () => {
		await clearQueue();
		const o = await order();
		const age = (id: string) =>
			db()`update print_jobs set claimed_at = now() - interval '61 seconds' where id = ${id}`;
		const first = (await claimJob(a))!;
		expect(await claimJob(b)).toBeNull();
		await age(first.id);
		const second = (await claimJob(b))!;
		expect(second).toMatchObject({ id: first.id, attempts: 2 });
		// A failed print goes straight back to the queue.
		expect(await ackJob(b, second.id, false, 'sem papel')).toBe(true);
		const third = (await claimJob(a))!;
		expect(third.attempts).toBe(3);
		await age(third.id);
		expect(await claimJob(a)).toBeNull();
		const [s] = await printStatus(o.id);
		expect(s.status).toBe('failed');
	});

	it('reprints add a job, even after a failure', async () => {
		await clearQueue();
		const o = await order();
		const first = (await claimJob(a))!;
		await ackJob(a, first.id, true);
		await reprint(o.id, 'kitchen', manager);
		const again = (await claimJob(a))!;
		expect(again.orderId).toBe(o.id);
		expect(again.id).not.toBe(first.id);
		await ackJob(a, again.id, true);
		// A reprint for an order that never had a ticket also works.
		await unpairStation(a.id, manager);
		await unpairStation(b.id, manager);
		const lone = await order();
		pairedIds = [];
		await reprint(lone.id, 'kitchen', manager);
		expect((await printStatus(lone.id))[0].status).toBe('queued');
		await clearQueue();
	});
});
