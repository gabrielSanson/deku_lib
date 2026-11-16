// S2.2: linking a store to the platform's iFood app, homologation mode, and cancellations that
// wait for iFood's confirmation.
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resetConfigForTests } from '#lib/server/config.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import {
	ifoodClient,
	IfoodApiError,
	type IfoodClient,
	type IfoodEvent
} from '#lib/server/integrations/ifood/api.ts';
import { stubAppAuth } from '#lib/server/integrations/ifood/auth.ts';
import {
	finishIfoodLink,
	setIfoodHomologation,
	startIfoodLink,
	unlinkIfood
} from '#lib/server/integrations/ifood/connect.ts';
import { ifoodHomologationProgress } from '#lib/server/integrations/ifood/homologation.ts';
import type { IfoodOrder } from '#lib/server/integrations/ifood/mapping.ts';
import {
	pollIfoodOnce,
	processIfoodEvent,
	syncOrderToIfood
} from '#lib/server/integrations/ifood/service.ts';
import { ifoodSettings, invalidateIfoodSettings } from '#lib/server/integrations/ifood/settings.ts';
import { transitionOrder } from '#lib/server/orders/service.ts';
import { makeStaff } from './helpers.ts';

const fixture = JSON.parse(
	readFileSync('tests/fixtures/ifood/order-delivery.json', 'utf8')
) as IfoodOrder;
const owner = { type: 'staff' as const, id: null };

function fakeClient(orders: Record<string, IfoodOrder>, queue: IfoodEvent[]) {
	const actions: { path: string; body: unknown }[] = [];
	const client = {
		async poll() {
			return queue.splice(0);
		},
		async acknowledge() {},
		async order(id: string) {
			if (!orders[id]) throw new IfoodApiError('not found', 404, '');
			return orders[id];
		},
		async action(path: string, body?: unknown) {
			actions.push({ path, body });
			return { status: 202, body: '' };
		}
	} as unknown as IfoodClient;
	return { client, actions };
}

async function deliver(client: IfoodClient, queue: IfoodEvent[], ev: IfoodEvent) {
	queue.push(ev);
	await pollIfoodOnce(client);
	const [row] = await db()<{ id: string }[]>`
		select id from channel_events where provider_event_id = ${ev.id}`;
	return processIfoodEvent(row.id, client);
}

async function orderOf(channelOrderId: string) {
	const [o] = await db()<
		{ id: string; status: string; cancel_requested_at: Date | null; cancel_reason: string | null }[]
	>`select id, status, cancel_requested_at, cancel_reason from orders
		where channel = 'ifood' and channel_order_id = ${channelOrderId}`;
	return o;
}

beforeAll(() => {
	process.env.IFOOD_APP_STUB = 'true';
	resetConfigForTests();
});

afterAll(async () => {
	await unlinkIfood(owner);
	await setIfoodHomologation(false, owner);
	delete process.env.IFOOD_APP_STUB;
	resetConfigForTests();
	await stopBoss();
	await closeDb();
});

describe('Conectar com iFood', () => {
	it('refuses an authorization code when no link was started', async () => {
		await expect(finishIfoodLink('ok-1', owner, stubAppAuth, async () => [])).rejects.toThrow();
	});

	it('links the store with a code and keeps the refresh token per shop', async () => {
		const link = await startIfoodLink(owner, stubAppAuth);
		expect(link.userCode).toBe('TEST-1234');
		const r = await finishIfoodLink('ok-abc', owner, stubAppAuth, async () => [
			{ id: 'merchant-linked' }
		]);
		expect(r.merchantId).toBe('merchant-linked');
		const s = await ifoodSettings({ fresh: true });
		expect(s).toMatchObject({
			source: 'link',
			authMode: 'app',
			refreshToken: 'stub-refresh-ok-abc',
			merchantId: 'merchant-linked'
		});
	});

	it('signs in to iFood with the shop refresh token', async () => {
		const seen: string[] = [];
		const f = (async (_url: string, init?: RequestInit) => {
			seen.push(String((init?.headers as Record<string, string>)?.authorization));
			return new Response('{"id":"merchant-linked"}', { status: 200 });
		}) as typeof fetch;
		await ifoodClient(f).merchant();
		expect(seen).toEqual(['Bearer stub-access']);
	});
});

describe('homologation and cancellations', () => {
	beforeAll(async () => {
		await setIfoodHomologation(true, owner);
		await db()`update ifood_settings set enabled = true where shop_id = current_shop_id()`;
		invalidateIfoodSettings();
	});

	it('keeps the full order payload and ticks the first case', async () => {
		const id = randomUUID();
		const queue: IfoodEvent[] = [];
		const { client } = fakeClient({ [id]: { ...fixture, id } }, queue);
		expect(await deliver(client, queue, { id: randomUUID(), code: 'PLC', orderId: id })).toBe(
			'created'
		);
		const [ev] = await db()<{ detail: { id: string } | null }[]>`
			select detail from channel_events where channel_order_id = ${id} and event_type = 'PLC'`;
		expect(ev.detail?.id).toBe(id);
		const progress = await ifoodHomologationProgress();
		expect(progress.find((c) => c.id === 'receive')?.doneAt).toBeInstanceOf(Date);
	});

	it('asks iFood to cancel and cancels only when iFood confirms', async () => {
		const id = randomUUID();
		const queue: IfoodEvent[] = [];
		const { client, actions } = fakeClient({ [id]: { ...fixture, id } }, queue);
		await deliver(client, queue, { id: randomUUID(), code: 'PLC', orderId: id });
		const manager = await makeStaff('admin');
		const o = await orderOf(id);
		const r = await transitionOrder({
			orderId: o.id,
			to: 'cancelled',
			actor: manager,
			reason: 'Acabou o produto'
		});
		expect(r).toMatchObject({ changed: false, requested: true });
		expect((await orderOf(id)).status).toBe('new');
		expect((await orderOf(id)).cancel_requested_at).toBeInstanceOf(Date);

		expect(
			await syncOrderToIfood({ orderId: o.id, to: 'cancelled', reason: 'Acabou o produto' }, client)
		).toBe('sent');
		expect(actions[0].path).toBe(`/order/v1.0/orders/${id}/requestCancellation`);

		await deliver(client, queue, { id: randomUUID(), code: 'CAN', orderId: id });
		const done = await orderOf(id);
		expect(done.status).toBe('cancelled');
		expect(done.cancel_reason).toBe('Acabou o produto');
		const progress = await ifoodHomologationProgress();
		expect(progress.find((c) => c.id === 'shopCancel')?.doneAt).toBeInstanceOf(Date);
	});

	it('goes on with the order when iFood refuses the cancellation', async () => {
		const id = randomUUID();
		const queue: IfoodEvent[] = [];
		const { client } = fakeClient({ [id]: { ...fixture, id } }, queue);
		await deliver(client, queue, { id: randomUUID(), code: 'PLC', orderId: id });
		const manager = await makeStaff('admin');
		const o = await orderOf(id);
		await transitionOrder({ orderId: o.id, to: 'cancelled', actor: manager, reason: 'Teste' });
		await deliver(client, queue, { id: randomUUID(), code: 'CARF', orderId: id });
		const after = await orderOf(id);
		expect(after.status).toBe('new');
		expect(after.cancel_requested_at).toBeNull();
	});
});
