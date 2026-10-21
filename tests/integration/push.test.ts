import { createECDH, randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import {
	pushPublicKey,
	savePushSubscription,
	sendReadyPush
} from '#lib/server/notifications/push.ts';
import { getOrderDetail } from '#lib/server/orders/queries.ts';
import { callOrder, createOrder, transitionOrder } from '#lib/server/orders/service.ts';
import { classic, makeStaff } from './helpers.ts';

let cashier: Awaited<ReturnType<typeof makeStaff>>;
let kitchen: Awaited<ReturnType<typeof makeStaff>>;

beforeAll(async () => {
	cashier = await makeStaff('admin');
	kitchen = await makeStaff('kitchen');
});

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

/** A subscription with real keys, pointing at a host that never answers. */
function fakeSubscription() {
	const ecdh = createECDH('prime256v1');
	ecdh.generateKeys();
	return {
		endpoint: `https://push.invalid/${randomUUID()}`,
		p256dh: ecdh.getPublicKey().toString('base64url'),
		auth: randomBytes(16).toString('base64url')
	};
}

async function paidOrder(fulfillmentType: 'dine_in' | 'delivery' = 'dine_in') {
	const order = await createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [classic],
		fulfillmentType,
		customerLabel: 'Ana',
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		paymentPlan: 'channel',
		actor: cashier
	});
	const [{ public_token }] = await db()<{ public_token: string }[]>`
		select public_token from orders where id = ${order.id}`;
	return { ...order, token: public_token };
}

const jobs = (orderId: string) =>
	db()<{ n: number }[]>`
		select count(*)::int n from pgboss.job where name = 'order-ready' and data->>'orderId' = ${orderId}`;

describe('ready alert', () => {
	it('makes the shop keys once', async () => {
		const a = await pushPublicKey();
		const b = await pushPublicKey();
		expect(a).toMatch(/^[A-Za-z0-9_-]{80,}$/);
		expect(b).toBe(a);
	});

	it('is queued when the order is ready and on every call', async () => {
		const order = await paidOrder();
		await savePushSubscription(order.token, fakeSubscription());
		await transitionOrder({ orderId: order.id, to: 'preparing', actor: kitchen });
		await transitionOrder({ orderId: order.id, to: 'ready', actor: kitchen });
		expect((await jobs(order.id))[0].n).toBe(1);
		await callOrder(order.id, cashier);
		await callOrder(order.id, cashier);
		expect((await jobs(order.id))[0].n).toBe(3);
	});

	it('records a failed delivery for staff', async () => {
		const order = await paidOrder();
		await savePushSubscription(order.token, fakeSubscription());
		await transitionOrder({ orderId: order.id, to: 'preparing', actor: kitchen });
		await transitionOrder({ orderId: order.id, to: 'ready', actor: kitchen });
		const result = await sendReadyPush(order.id);
		expect(result).toEqual({ sent: 0, failed: 1 });
		expect((await getOrderDetail(order.id))?.pushFailed).toBe(true);
	});

	it('forgets the phone once the order is done', async () => {
		const order = await paidOrder();
		await savePushSubscription(order.token, fakeSubscription());
		await transitionOrder({ orderId: order.id, to: 'preparing', actor: kitchen });
		await transitionOrder({ orderId: order.id, to: 'ready', actor: kitchen });
		await transitionOrder({ orderId: order.id, to: 'completed', actor: cashier });
		const [{ n }] = await db()<{ n: number }[]>`
			select count(*)::int n from order_push_subscriptions where order_id = ${order.id}`;
		expect(n).toBe(0);
		await expect(savePushSubscription(order.token, fakeSubscription())).rejects.toThrow(
			/não recebe aviso/
		);
	});

	it('is not offered for delivery orders', async () => {
		const order = await paidOrder('delivery');
		await expect(savePushSubscription(order.token, fakeSubscription())).rejects.toThrow(
			/não recebe aviso/
		);
	});
});
