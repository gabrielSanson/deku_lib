import { readFileSync } from 'node:fs';
import { createHmac, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resetConfigForTests } from '#lib/server/config.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import {
	IfoodApiError,
	type IfoodClient,
	type IfoodEvent
} from '#lib/server/integrations/ifood/api.ts';
import type { IfoodOrder } from '#lib/server/integrations/ifood/mapping.ts';
import {
	pollIfoodOnce,
	processIfoodEvent,
	receiveIfoodWebhook,
	syncOrderToIfood
} from '#lib/server/integrations/ifood/service.ts';
import { transitionOrder } from '#lib/server/orders/service.ts';
import { makeStaff } from './helpers.ts';

const fixture = JSON.parse(
	readFileSync('tests/fixtures/ifood/order-delivery.json', 'utf8')
) as IfoodOrder;

function fakeClient(orders: Record<string, IfoodOrder>, queue: IfoodEvent[] = []) {
	const calls: { kind: string; arg: unknown }[] = [];
	const client: IfoodClient = {
		async poll() {
			calls.push({ kind: 'poll', arg: null });
			return queue.splice(0);
		},
		async acknowledge(ids) {
			calls.push({ kind: 'ack', arg: ids });
		},
		async order(id) {
			calls.push({ kind: 'order', arg: id });
			if (!orders[id]) throw new IfoodApiError('not found', 404, '');
			return orders[id];
		},
		async action(path, body) {
			calls.push({ kind: 'action', arg: { path, body } });
		}
	};
	return { client, calls };
}

async function eventId(providerEventId: string) {
	const [r] = await db()<{ id: string; processing_status: string; acknowledged_at: Date | null }[]>`
		select id, processing_status, acknowledged_at from channel_events where provider_event_id = ${providerEventId}`;
	return r;
}

beforeAll(() => {
	process.env.IFOOD_ENABLED = 'true';
	process.env.IFOOD_CLIENT_ID = 'test-client';
	process.env.IFOOD_CLIENT_SECRET = 'test-secret';
	process.env.IFOOD_MERCHANT_ID = 'merchant-test';
	resetConfigForTests();
});

afterAll(async () => {
	delete process.env.IFOOD_ENABLED;
	resetConfigForTests();
	await stopBoss();
	await closeDb();
});

describe('iFood polling and order creation', () => {
	const orderId = randomUUID();
	const order = { ...fixture, id: orderId };

	it('stores events before acknowledging and ignores duplicates', async () => {
		const ev = { id: randomUUID(), code: 'PLC', orderId };
		const { client, calls } = fakeClient({ [orderId]: order }, [ev, ev]);
		const r = await pollIfoodOnce(client);
		expect(r).toEqual({ received: 2, stored: 1 });
		expect(calls.map((c) => c.kind)).toEqual(['poll', 'ack']);
		const stored = await eventId(ev.id);
		expect(stored.processing_status).toBe('received');
		expect(stored.acknowledged_at).not.toBeNull();

		expect(await processIfoodEvent(stored.id, client)).toBe('created');
		expect(await processIfoodEvent(stored.id, client)).toBe('skipped');
		const rows = await db()<
			{
				status: string;
				payment_status: string;
				total_cents: number;
				channel_display_id: string;
				fulfillment_provider: string;
				is_test: boolean;
			}[]
		>`
			select status, payment_status, total_cents, channel_display_id, fulfillment_provider, is_test from orders where channel_order_id = ${orderId}`;
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			status: 'new',
			payment_status: 'paid',
			total_cents: 8468,
			channel_display_id: '7F3A',
			fulfillment_provider: 'ifood_courier',
			is_test: true
		});
	});

	it('walks forward through statuses on later iFood events', async () => {
		const { client } = fakeClient({ [orderId]: order });
		const ev = { id: randomUUID(), code: 'DSP', orderId };
		await receiveSigned(ev);
		const stored = await eventId(ev.id);
		expect(await processIfoodEvent(stored.id, client)).toBe('processed');
		const history = await db()<{ to_status: string; actor_type: string }[]>`
			select h.to_status, h.actor_type from order_status_history h join orders o on o.id = h.order_id
			where o.channel_order_id = ${orderId} order by h.occurred_at, h.id`;
		expect(history.map((h) => h.to_status)).toEqual(['new', 'confirmed', 'preparing', 'ready']);
		expect(history.slice(1).every((h) => h.actor_type === 'integration')).toBe(true);
	});

	it('retries when the order detail is not available yet', async () => {
		const late = randomUUID();
		const { client } = fakeClient({});
		const ev = { id: randomUUID(), code: 'PLC', orderId: late };
		await receiveSigned(ev);
		const stored = await eventId(ev.id);
		await expect(processIfoodEvent(stored.id, client)).rejects.toThrow();
		expect((await eventId(ev.id)).processing_status).toBe('failed');
	});
});

async function receiveSigned(ev: IfoodEvent) {
	const body = new TextEncoder().encode(JSON.stringify(ev));
	const sig = createHmac('sha256', 'test-secret').update(body).digest('hex');
	const r = await receiveIfoodWebhook(body, new Headers({ 'x-ifood-signature': sig }));
	expect(r.status).toBe(202);
}

describe('iFood webhook', () => {
	it('rejects a bad signature without storing anything', async () => {
		const ev = { id: randomUUID(), code: 'PLC', orderId: randomUUID() };
		const r = await receiveIfoodWebhook(
			new TextEncoder().encode(JSON.stringify(ev)),
			new Headers({ 'x-ifood-signature': 'deadbeef' })
		);
		expect(r.status).toBe(401);
		expect(await eventId(ev.id)).toBeUndefined();
	});
});

describe('mirroring our changes to iFood', () => {
	it('confirms on iFood once, even when the job runs twice', async () => {
		const orderId = randomUUID();
		const { client, calls } = fakeClient({ [orderId]: { ...fixture, id: orderId } });
		const ev = { id: randomUUID(), code: 'PLC', orderId };
		await receiveSigned(ev);
		await processIfoodEvent((await eventId(ev.id)).id, client);
		const [o] = await db()<
			{ id: string }[]
		>`select id from orders where channel_order_id = ${orderId}`;
		const manager = await makeStaff('manager');
		await transitionOrder({ orderId: o.id, to: 'confirmed', actor: manager });

		expect(await syncOrderToIfood({ orderId: o.id, to: 'confirmed' }, client)).toBe('sent');
		expect(await syncOrderToIfood({ orderId: o.id, to: 'confirmed' }, client)).toBe('sent');
		const actions = calls.filter((c) => c.kind === 'action');
		expect(actions).toHaveLength(1);
		expect((actions[0].arg as { path: string }).path).toBe(`/order/v1.0/orders/${orderId}/confirm`);
	});
});
