import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resetConfigForTests } from '#lib/server/config.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { signStub } from '#lib/server/payments/local-stub.ts';
import {
	expireUnpaidCheckouts,
	processPaymentEvent,
	receivePaymentWebhook,
	startOnlinePayment
} from '#lib/server/payments/online.ts';
import { updateStoreSettings, getStoreSettings } from '#lib/server/settings/service.ts';
import { classic, makeStaff } from './helpers.ts';

beforeAll(async () => {
	process.env.PAYMENT_PROVIDER = 'local_stub';
	resetConfigForTests();
	const owner = await makeStaff('owner');
	const s = await getStoreSettings();
	await updateStoreSettings(
		{ acceptingOrders: true, webOrderingEnabled: true, pickupEnabled: true },
		owner,
		s.version
	);
});

afterAll(async () => {
	delete process.env.PAYMENT_PROVIDER;
	resetConfigForTests();
	await stopBoss();
	await closeDb();
});

async function webOrder() {
	const order = await createOrder({
		channel: 'web',
		sourceMode: 'web',
		lines: [classic],
		fulfillmentType: 'pickup',
		customer: { name: 'Ana', phoneE164: '+5511987654321' },
		idempotencyKey: randomUUID(),
		paymentPlan: 'online',
		actor: { type: 'customer', id: null }
	});
	const pay = await startOnlinePayment({
		orderId: order.id,
		method: 'pix',
		idempotencyKey: `pay:${order.id}`,
		returnUrl: 'http://localhost/x'
	});
	const [t] = await db()<
		{ provider_reference: string }[]
	>`select provider_reference from tenders where id = ${pay.tenderId}`;
	return { order, pay, reference: t.provider_reference };
}

function webhook(paymentId: string, status = 'paid', eventId = `evt_${randomUUID()}`) {
	const body = JSON.stringify({
		id: eventId,
		type: 'payment.updated',
		payment_id: paymentId,
		status
	});
	return {
		raw: new TextEncoder().encode(body),
		headers: new Headers({ 'x-stub-signature': signStub(body) }),
		eventId
	};
}

async function orderState(id: string) {
	const [o] = await db()<
		{ status: string; payment_status: string }[]
	>`select status, payment_status from orders where id = ${id}`;
	return o;
}

describe('online payments', () => {
	it('returns the same checkout for a retried start', async () => {
		const { order, pay } = await webOrder();
		const again = await startOnlinePayment({
			orderId: order.id,
			method: 'pix',
			idempotencyKey: `pay:${order.id}`,
			returnUrl: 'http://localhost/x'
		});
		expect(again.tenderId).toBe(pay.tenderId);
		expect(pay.pixCode).toBeTruthy();
	});

	it('marks a paid order and sends it to the kitchen once', async () => {
		const { order, reference } = await webOrder();
		expect(await orderState(order.id)).toEqual({ status: 'new', payment_status: 'pending' });
		const w = webhook(reference);
		expect((await receivePaymentWebhook('local_stub', w.raw, w.headers)).status).toBe(200);
		expect((await receivePaymentWebhook('local_stub', w.raw, w.headers)).status).toBe(200);
		const events = await db()<
			{ id: string }[]
		>`select id from payment_events where provider_event_id = ${w.eventId}`;
		expect(events).toHaveLength(1);
		await processPaymentEvent(events[0].id);
		await processPaymentEvent(events[0].id);
		expect(await orderState(order.id)).toEqual({ status: 'confirmed', payment_status: 'paid' });
		const [{ n }] = await db()<
			{ n: number }[]
		>`select count(*)::int as n from order_status_history where order_id = ${order.id} and to_status = 'confirmed'`;
		expect(n).toBe(1);
	});

	it('ignores a late failure after payment', async () => {
		const { order, reference } = await webOrder();
		for (const status of ['paid', 'failed']) {
			const w = webhook(reference, status);
			await receivePaymentWebhook('local_stub', w.raw, w.headers);
			const [e] = await db()<
				{ id: string }[]
			>`select id from payment_events where provider_event_id = ${w.eventId}`;
			await processPaymentEvent(e.id);
		}
		expect((await orderState(order.id)).payment_status).toBe('paid');
	});

	it('rejects unsigned webhooks', async () => {
		const w = webhook('stub_x');
		const r = await receivePaymentWebhook(
			'local_stub',
			w.raw,
			new Headers({ 'x-stub-signature': 'nope' })
		);
		expect(r.status).toBe(401);
		expect((await receivePaymentWebhook('other', w.raw, w.headers)).status).toBe(404);
	});

	it('cancels online orders whose checkout expired unpaid', async () => {
		const { order, pay } = await webOrder();
		await db()`update tenders set expires_at = now() - interval '10 minutes' where id = ${pay.tenderId}`;
		expect(await expireUnpaidCheckouts()).toBeGreaterThanOrEqual(1);
		expect(await orderState(order.id)).toMatchObject({ status: 'cancelled' });
	});
});

describe('stale-orders job', () => {
	it('runs without errors', async () => {
		const { handleStaleOrders } = await import('#lib/server/worker/handlers.ts');
		const r = await handleStaleOrders();
		expect(r.waiting).toBeGreaterThanOrEqual(0);
	});
});
