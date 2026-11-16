// S2.5: an Open Delivery (99Food) order comes in, moves through every status with the outbound
// call recorded, and a cancellation waits for the partner's event.
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import {
	OdApiError,
	type OdClient,
	type OdEvent
} from '#lib/server/integrations/opendelivery/api.ts';
import type { OdOrder } from '#lib/server/integrations/opendelivery/mapping.ts';
import {
	checkOdConnection,
	pollOdOnce,
	processOdEvent,
	receiveOdWebhook,
	syncOrderToOd
} from '#lib/server/integrations/opendelivery/service.ts';
import {
	odSettings,
	saveOdSettings,
	setOdEnabled
} from '#lib/server/integrations/opendelivery/settings.ts';
import { transitionOrder } from '#lib/server/orders/service.ts';
import { makeStaff } from './helpers.ts';

const fixture = JSON.parse(
	readFileSync('tests/fixtures/opendelivery/order.json', 'utf8')
) as OdOrder & { id: string };
const owner = { type: 'staff' as const, id: null };
const SECRET = 'od-secret-test';

function fakeClient(orders: Record<string, unknown>, queue: OdEvent[]) {
	const actions: { id: string; action: string; body: unknown }[] = [];
	const client = {
		async authenticate() {},
		async merchant() {
			return { id: 'm-1' };
		},
		async poll() {
			return queue.splice(0);
		},
		async acknowledge() {},
		async order(id: string) {
			if (!orders[id]) throw new OdApiError('not found', 404, '');
			return orders[id];
		},
		async action(id: string, action: string, body?: unknown) {
			actions.push({ id, action, body });
			return { status: 202, body: '' };
		}
	} as unknown as OdClient;
	return { client, actions };
}

async function deliver(client: OdClient, queue: OdEvent[], ev: OdEvent) {
	queue.push(ev);
	await pollOdOnce('99food', client);
	const [row] = await db()<{ id: string }[]>`
		select id from channel_events where provider_event_id = ${ev.eventId}`;
	return processOdEvent('99food', row.id, client);
}

async function orderOf(channelOrderId: string) {
	const [o] = await db()<
		{
			id: string;
			status: string;
			channel_partner: string;
			cancel_requested_at: Date | null;
			cancel_reason: string | null;
		}[]
	>`select id, status, channel_partner, cancel_requested_at, cancel_reason from orders
		where channel = 'opendelivery' and channel_order_id = ${channelOrderId}`;
	return o;
}

const event = (type: string, orderId: string): OdEvent => ({
	eventId: randomUUID(),
	eventType: type,
	orderId
});

beforeAll(async () => {
	await saveOdSettings(
		'99food',
		{
			baseUrl: 'https://od.example.test',
			clientId: 'client-1',
			clientSecret: SECRET,
			merchantId: 'm-1'
		},
		owner
	);
});

afterAll(async () => {
	await db()`delete from opendelivery_settings where shop_id = current_shop_id()`;
	await stopBoss();
	await closeDb();
});

describe('Open Delivery connection', () => {
	it('refuses to turn on before a successful test', async () => {
		await expect(setOdEnabled('99food', true, owner)).rejects.toThrow();
	});

	it('turns on after the connection test passes', async () => {
		const { client } = fakeClient({}, []);
		expect(await checkOdConnection('99food', client)).toEqual({ ok: true });
		await setOdEnabled('99food', true, owner);
		expect((await odSettings('99food')).enabled).toBe(true);
	});

	it('explains a refused secret in Portuguese', async () => {
		const client = {
			async authenticate() {
				throw new OdApiError('token', 401, '');
			}
		} as unknown as OdClient;
		const r = await checkOdConnection('99food', client);
		expect(r.ok).toBe(false);
		expect(r.ok === false && r.error).toMatch(/Client Secret/);
		// A failed test does not turn orders off; restore the passing state for the next tests.
		await checkOdConnection('99food', fakeClient({}, []).client);
	});
});

describe('Open Delivery orders', () => {
	it('creates the order on the board and mirrors every status', async () => {
		const id = `od-${randomUUID()}`;
		const queue: OdEvent[] = [];
		const { client, actions } = fakeClient({ [id]: { ...fixture, id } }, queue);
		expect(await deliver(client, queue, event('CREATED', id))).toBe('created');
		const o = await orderOf(id);
		expect(o).toMatchObject({ status: 'new', channel_partner: '99food' });

		const manager = await makeStaff('admin');
		for (const to of ['confirmed', 'preparing', 'ready', 'completed'] as const) {
			await transitionOrder({ orderId: o.id, to, actor: manager });
			await syncOrderToOd({ orderId: o.id, to }, client);
		}
		expect((await orderOf(id)).status).toBe('completed');
		expect(actions.map((a) => a.action)).toEqual(['confirm', 'readyForPickup']);
		const out = await db()<{ action: string; status: string }[]>`
			select action, status from channel_outbound where order_id = ${o.id} order by created_at`;
		expect(out.filter((r) => r.status === 'sent').map((r) => r.action)).toEqual([
			'confirm',
			'readyForPickup'
		]);
	});

	it('asks the partner to cancel and cancels only when the partner confirms', async () => {
		const id = `od-${randomUUID()}`;
		const queue: OdEvent[] = [];
		const { client, actions } = fakeClient({ [id]: { ...fixture, id } }, queue);
		await deliver(client, queue, event('CREATED', id));
		const manager = await makeStaff('admin');
		const o = await orderOf(id);
		const r = await transitionOrder({
			orderId: o.id,
			to: 'cancelled',
			actor: manager,
			reason: 'Loja fechando'
		});
		expect(r).toMatchObject({ changed: false, requested: true });
		expect((await orderOf(id)).status).toBe('new');

		expect(
			await syncOrderToOd({ orderId: o.id, to: 'cancelled', reason: 'Loja fechando' }, client)
		).toBe('sent');
		expect(actions[0].action).toBe('requestCancellation');

		await deliver(client, queue, event('CANCELLED', id));
		const done = await orderOf(id);
		expect(done.status).toBe('cancelled');
		expect(done.cancel_reason).toBe('Loja fechando');
	});

	it('goes on with the order when the partner denies the cancellation', async () => {
		const id = `od-${randomUUID()}`;
		const queue: OdEvent[] = [];
		const { client } = fakeClient({ [id]: { ...fixture, id } }, queue);
		await deliver(client, queue, event('CREATED', id));
		const manager = await makeStaff('admin');
		const o = await orderOf(id);
		await transitionOrder({ orderId: o.id, to: 'cancelled', actor: manager, reason: 'Teste' });
		await deliver(client, queue, event('CANCELLATION_REQUEST_DENIED', id));
		const after = await orderOf(id);
		expect(after.status).toBe('new');
		expect(after.cancel_requested_at).toBeNull();
	});
});

describe('Open Delivery webhook', () => {
	const body = (id: string) => new TextEncoder().encode(JSON.stringify(event('CREATED', id)));

	it('rejects a wrong signature', async () => {
		const raw = body('od-x');
		const r = await receiveOdWebhook('99food', raw, new Headers({ 'x-app-signature': 'bad' }));
		expect(r.status).toBe(401);
	});

	it('stores an event with a good signature', async () => {
		const id = `od-${randomUUID()}`;
		const raw = body(id);
		const sig = createHmac('sha256', SECRET).update(raw).digest('hex');
		const r = await receiveOdWebhook('99food', raw, new Headers({ 'x-app-signature': sig }));
		expect(r.status).toBe(202);
		const [ev] = await db()<{ channel: string }[]>`
			select channel from channel_events where channel_order_id = ${id}`;
		expect(ev.channel).toBe('opendelivery_99food');
	});

	it('answers 404 for a partner that is off', async () => {
		const r = await receiveOdWebhook('keeta', body('od-y'), new Headers());
		expect(r.status).toBe(404);
	});
});
