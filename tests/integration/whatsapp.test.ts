// S3.1: the WhatsApp bot (greeting with the menu link, order status, call a person) and the four
// order status templates, through the local stub, with signed webhooks.
import { createHmac, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resetConfigForTests } from '#lib/server/config.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { stubSent } from '#lib/server/messaging/local-stub.ts';
import { sendOutboxMessage } from '#lib/server/messaging/outbox.ts';
import { createOrder, transitionOrder } from '#lib/server/orders/service.ts';
import {
	markConversationHandled,
	notifyOrderEvent,
	processWhatsappInbound,
	receiveWhatsappWebhook,
	waitingConversations,
	whatsappChallenge,
	whatsappLinkPhone
} from '#lib/server/whatsapp/service.ts';
import {
	recordWhatsappTest,
	saveWhatsappSettings,
	setWhatsappEnabled,
	whatsappSettings
} from '#lib/server/whatsapp/settings.ts';
import { classic, ensureCashOpen, makeStaff } from './helpers.ts';

const owner = { type: 'staff' as const, id: null };
const APP_SECRET = 'wa-app-secret';
let manager: Awaited<ReturnType<typeof makeStaff>>;

function phoneDigits() {
	return `55119${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
}

function signed(body: unknown) {
	const raw = new TextEncoder().encode(JSON.stringify(body));
	const sig = 'sha256=' + createHmac('sha256', APP_SECRET).update(raw).digest('hex');
	return { raw, headers: new Headers({ 'x-hub-signature-256': sig }) };
}

const inbound = (from: string, text: string) => ({
	entry: [
		{
			changes: [
				{
					value: {
						messages: [{ id: `wamid.${randomUUID()}`, from, type: 'text', text: { body: text } }]
					}
				}
			]
		}
	]
});

/** Delivers a customer message and returns the bot's reply text. */
async function say(from: string, text: string) {
	const body = inbound(from, text);
	const { raw, headers } = signed(body);
	expect((await receiveWhatsappWebhook(raw, headers)).status).toBe(200);
	const id = body.entry[0].changes[0].value.messages[0].id;
	const [ev] = await db()<{ id: string }[]>`
		select id from channel_events where channel = 'whatsapp' and provider_event_id = ${id}`;
	await processWhatsappInbound(ev.id);
	const [out] = await db()<{ id: string; vars: { body: string } }[]>`
		select id, vars from message_outbox where to_address = ${'+' + from} and template = '_text'
		order by created_at desc limit 1`;
	expect(await sendOutboxMessage(out.id)).toBe('sent');
	return out.vars.body;
}

async function orderFor(phone: string, opts: { optIn?: boolean } = {}) {
	return createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [classic],
		fulfillmentType: 'counter',
		customer: { name: 'Ana Souza', phoneE164: phone, whatsappUpdates: opts.optIn },
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		actor: manager
	});
}

async function templatesFor(orderId: string) {
	return (
		await db()<{ template: string }[]>`
			select template from message_outbox where order_id = ${orderId} order by created_at`
	).map((r) => r.template);
}

beforeAll(async () => {
	process.env.WHATSAPP_STUB = 'true';
	resetConfigForTests();
	manager = await makeStaff('admin');
	await ensureCashOpen(manager);
	await saveWhatsappSettings(
		{
			phoneNumberId: '1234567890',
			wabaId: '999',
			displayPhone: '11 99999-0000',
			accessToken: 'token',
			appSecret: APP_SECRET
		},
		owner
	);
});

afterAll(async () => {
	await db()`update whatsapp_settings set enabled = false where shop_id = current_shop_id()`;
	delete process.env.WHATSAPP_STUB;
	resetConfigForTests();
	await stopBoss();
	await closeDb();
});

describe('WhatsApp setup', () => {
	it('turns on only after a successful test message', async () => {
		await expect(setWhatsappEnabled(true, owner)).rejects.toThrow();
		await recordWhatsappTest(null);
		await setWhatsappEnabled(true, owner);
		expect((await whatsappSettings()).enabled).toBe(true);
	});

	it("answers Meta's subscription check only with the shop's verify token", async () => {
		const { verifyToken } = await whatsappSettings();
		const ok = new URLSearchParams({
			'hub.mode': 'subscribe',
			'hub.verify_token': verifyToken,
			'hub.challenge': '42'
		});
		expect(await whatsappChallenge(ok)).toBe('42');
		ok.set('hub.verify_token', 'wrong-token-wrong-token-wrong-to');
		expect(await whatsappChallenge(ok)).toBeNull();
	});

	it('rejects a message with a bad signature', async () => {
		const raw = new TextEncoder().encode(JSON.stringify(inbound(phoneDigits(), 'oi')));
		const r = await receiveWhatsappWebhook(
			raw,
			new Headers({ 'x-hub-signature-256': 'sha256=00' })
		);
		expect(r.status).toBe(401);
	});
});

describe('WhatsApp bot', () => {
	it('greets with the menu link tied to the number', async () => {
		const from = phoneDigits();
		const reply = await say(from, 'Oi, boa noite');
		const token = reply.match(/\/cardapio\?wa=([0-9a-f]{24})/)?.[1];
		expect(token).toBeTruthy();
		expect(await whatsappLinkPhone(token)).toBe('+' + from);
		expect(stubSent.at(-1)).toMatchObject({
			channel: 'whatsapp',
			to: '+' + from,
			template: '_text'
		});
	});

	it("answers with the customer's last order", async () => {
		const from = phoneDigits();
		const order = await orderFor('+' + from);
		const reply = await say(from, 'cadê meu pedido?');
		expect(reply).toContain(String(order.orderNumber));
	});

	it('flags a request for a person until staff mark it handled', async () => {
		const from = phoneDigits();
		await say(from, 'quero falar com atendente');
		expect((await waitingConversations()).map((w) => w.phone)).toContain('+' + from);
		await markConversationHandled('+' + from);
		expect((await waitingConversations()).map((w) => w.phone)).not.toContain('+' + from);
	});
});

describe('order status templates', () => {
	it('sends received, ready and cancelled to a customer who opted in', async () => {
		const o = await orderFor('+' + phoneDigits(), { optIn: true });
		expect(await notifyOrderEvent(o.id, 'placed')).toBe('queued');
		expect(await notifyOrderEvent(o.id, 'placed')).toBe('skipped');
		await transitionOrder({ orderId: o.id, to: 'preparing', actor: manager });
		await transitionOrder({ orderId: o.id, to: 'ready', actor: manager });
		const [job] = await db()<{ n: number }[]>`
			select count(*)::int as n from pgboss.job where name = 'whatsapp-notify'
			and data->>'orderId' = ${o.id} and data->>'event' = 'ready'`;
		expect(job.n).toBe(1);
		expect(await notifyOrderEvent(o.id, 'ready')).toBe('queued');
		expect(await templatesFor(o.id)).toEqual(['pedido_recebido', 'pedido_pronto']);
	});

	it('says "saiu para entrega" for own delivery and sends the cancellation', async () => {
		const o = await orderFor('+' + phoneDigits(), { optIn: true });
		await db()`update orders set fulfillment_type = 'delivery', fulfillment_provider = 'own_driver'
			where id = ${o.id}`;
		await notifyOrderEvent(o.id, 'ready');
		await notifyOrderEvent(o.id, 'cancelled');
		expect(await templatesFor(o.id)).toEqual(['saiu_para_entrega', 'pedido_cancelado']);
		const [m] = await db()<{ id: string; vars: Record<string, string> }[]>`
			select id, vars from message_outbox where order_id = ${o.id} and template = 'saiu_para_entrega'`;
		expect(m.vars).toMatchObject({ nome: 'Ana', numero: String(o.orderNumber) });
		expect(await sendOutboxMessage(m.id)).toBe('sent');
	});

	it('messages a customer who did not opt in only inside 24 hours of their message', async () => {
		const from = phoneDigits();
		const o = await orderFor('+' + from);
		expect(await notifyOrderEvent(o.id, 'placed')).toBe('skipped');
		await say(from, 'oi');
		expect(await notifyOrderEvent(o.id, 'placed')).toBe('queued');
	});

	it('never messages a delivery app customer', async () => {
		const o = await orderFor('+' + phoneDigits(), { optIn: true });
		await db()`update orders set channel = 'ifood', channel_order_id = ${randomUUID()} where id = ${o.id}`;
		expect(await notifyOrderEvent(o.id, 'ready')).toBe('skipped');
	});
});
