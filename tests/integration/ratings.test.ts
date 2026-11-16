// S3.7: "Como foi?" after a completed order. One rating per order, private, low ones flagged.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	markRatingSeen,
	ratingPage,
	ratingSummary,
	rateOrder,
	requestRating
} from '#lib/server/customers/ratings.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder, transitionOrder } from '#lib/server/orders/service.ts';
import { classic, ensureCashOpen, makeStaff } from './helpers.ts';

let manager: Awaited<ReturnType<typeof makeStaff>>;
const tag = randomUUID().slice(0, 6);

async function completedOrder(email: string | null) {
	const o = await createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [classic],
		fulfillmentType: 'counter',
		customer: email ? { name: `Rui ${tag}`, email } : undefined,
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		actor: manager
	});
	for (const to of ['preparing', 'ready', 'completed'] as const)
		await transitionOrder({ orderId: o.id, to, actor: manager });
	const [r] = await db()<{ public_token: string }[]>`
		select public_token from orders where id = ${o.id}`;
	return { id: o.id, token: r.public_token };
}

beforeAll(async () => {
	manager = await makeStaff('admin');
	await ensureCashOpen(manager);
});

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

describe('order ratings', () => {
	it('queues the request an hour after completion and sends it once by e-mail', async () => {
		const email = `rui-${tag}@x.test`;
		const o = await completedOrder(email);
		const [job] = await db()<{ start_after: Date }[]>`
			select start_after from pgboss.job where name = 'rating-request' and data->>'orderId' = ${o.id}`;
		expect(job.start_after.getTime()).toBeGreaterThan(Date.now() + 50 * 60_000);

		expect(await requestRating(o.id)).toBe('queued');
		expect(await requestRating(o.id)).toBe('skipped');
		const [m] = await db()<{ vars: { body: string } }[]>`
			select vars from message_outbox where order_id = ${o.id} and to_address = ${email}`;
		expect(m.vars.body).toContain(`/avaliar/${o.token}`);
	});

	it('takes one rating per completed order and flags a low one until seen', async () => {
		const o = await completedOrder(null);
		expect(await ratingPage(o.token)).toMatchObject({ rateable: true, stars: null });
		await expect(rateOrder(o.token, 0)).rejects.toThrow();
		await rateOrder(o.token, 2, '  Chegou frio  ');
		await expect(rateOrder(o.token, 5)).rejects.toThrow();
		expect((await ratingPage(o.token))?.stars).toBe(2);

		let s = await ratingSummary();
		expect(s.count).toBeGreaterThan(0);
		expect(s.low.find((r) => r.orderId === o.id)?.comment).toBe('Chegou frio');
		await markRatingSeen(o.id, { type: 'staff', id: manager.id });
		s = await ratingSummary();
		expect(s.low.some((r) => r.orderId === o.id)).toBe(false);
	});

	it('refuses orders that are not completed', async () => {
		const o = await createOrder({
			channel: 'counter',
			sourceMode: 'staff_pos',
			lines: [classic],
			fulfillmentType: 'counter',
			idempotencyKey: randomUUID(),
			initialStatus: 'confirmed',
			actor: manager
		});
		const [r] = await db()<{ public_token: string }[]>`
			select public_token from orders where id = ${o.id}`;
		expect((await ratingPage(r.public_token))?.rateable).toBe(false);
		await expect(rateOrder(r.public_token, 5)).rejects.toThrow();
		expect(await requestRating(o.id)).toBe('skipped');
	});
});
