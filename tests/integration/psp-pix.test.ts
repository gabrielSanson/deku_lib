// S3.2: automatic Pix through Efí (Pix API): a charge per order, the notification checked by our
// token, the status read back from the PSP, and the order confirmed on its own.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import {
	processPaymentEvent,
	receivePaymentWebhook,
	startOnlinePayment
} from '#lib/server/payments/online.ts';
import type { Transport } from '#lib/server/payments/pix-bacen.ts';
import {
	paymentProvider,
	registerPspWebhook,
	savePaymentSettings,
	setPixTransportForTests
} from '#lib/server/payments/provider.ts';
import { getShopSecret } from '#lib/server/platform/secrets.ts';
import { getStoreSettings, updateStoreSettings } from '#lib/server/settings/service.ts';
import { classic, makeStaff } from './helpers.ts';

const cobs = new Map<string, { status: string; pixCopiaECola: string }>();
const calls: { method: string; path: string; body?: string }[] = [];
const fakePsp: Transport = async (method, url, _headers, body) => {
	const path = new URL(url).pathname;
	calls.push({ method, path, body });
	if (path === '/oauth/token') return { status: 200, body: JSON.stringify({ access_token: 'at' }) };
	const cob = path.match(/^\/v2\/cob\/(\w+)$/);
	if (cob && method === 'PUT') {
		const c = { status: 'ATIVA', pixCopiaECola: `000201PIX${cob[1]}` };
		cobs.set(cob[1], c);
		return { status: 201, body: JSON.stringify(c) };
	}
	if (cob && method === 'GET') {
		const c = cobs.get(cob[1]);
		return c ? { status: 200, body: JSON.stringify(c) } : { status: 404, body: '' };
	}
	if (path.startsWith('/v2/webhook/')) return { status: 200, body: '{}' };
	return { status: 404, body: '' };
};

let owner: Awaited<ReturnType<typeof makeStaff>>;

beforeAll(async () => {
	setPixTransportForTests(fakePsp);
	owner = await makeStaff('admin');
	const s = await getStoreSettings();
	await updateStoreSettings(
		{ acceptingOrders: true, webOrderingEnabled: true, pickupEnabled: true },
		owner,
		s.version
	);
	await savePaymentSettings(
		{
			provider: 'efi',
			methods: ['pix'],
			psp: {
				clientId: 'efi-client',
				clientSecret: 'efi-secret',
				pixKey: 'pix@loja.test',
				sandbox: true,
				certificate: Buffer.from('not a real cert').toString('base64')
			}
		},
		{ type: 'staff', id: owner.id }
	);
});

afterAll(async () => {
	// Leave the default shop as other tests expect it: no saved payment choice.
	await db()`delete from payment_settings where shop_id = current_shop_id()`;
	setPixTransportForTests(null);
	await stopBoss();
	await closeDb();
});

async function orderState(id: string) {
	const [o] = await db()<
		{ status: string; payment_status: string }[]
	>`select status, payment_status from orders where id = ${id}`;
	return o;
}

describe('Pix through Efí', () => {
	it('refuses card with Efí', async () => {
		await expect(
			savePaymentSettings(
				{
					provider: 'efi',
					methods: ['pix', 'online_card'],
					psp: { clientId: 'x', pixKey: 'y', sandbox: true }
				},
				{ type: 'staff', id: owner.id }
			)
		).rejects.toMatchObject({ key: 'err.payments.pspPixOnly' });
	});

	it('creates a charge, confirms the order when the PSP says it is paid', async () => {
		expect((await paymentProvider())?.methods).toEqual(['pix']);
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
		expect(pay.pixCode).toMatch(/^000201PIX/);
		const [t] = await db()<{ provider: string; provider_reference: string }[]>`
			select provider, provider_reference from tenders where id = ${pay.tenderId}`;
		expect(t.provider).toBe('efi');

		const token = (await getShopSecret('efi_webhook'))!;
		const raw = new TextEncoder().encode(
			JSON.stringify({ pix: [{ txid: t.provider_reference, endToEndId: 'E123' }] })
		);
		// A notification without our token is refused.
		const bad = new URL('https://loja.test/api/v1/payments/webhooks/efi/s?hmac=wrong');
		expect((await receivePaymentWebhook('efi', raw, new Headers(), bad)).status).toBe(401);

		// Still unpaid at the PSP: stored, nothing changes.
		const url = new URL(
			`https://loja.test/api/v1/payments/webhooks/efi/s?hmac=${token}&ignorar=/pix`
		);
		expect((await receivePaymentWebhook('efi', raw, new Headers(), url)).status).toBe(200);

		cobs.get(t.provider_reference)!.status = 'CONCLUIDA';
		expect((await receivePaymentWebhook('efi', raw, new Headers(), url)).status).toBe(200);
		const events = await db()<{ id: string }[]>`
			select id from payment_events where provider = 'efi' and payload->>'providerPaymentId' = ${t.provider_reference}
			order by received_at`;
		for (const e of events) await processPaymentEvent(e.id);
		expect(await orderState(order.id)).toMatchObject({
			payment_status: 'paid',
			status: 'confirmed'
		});
	});

	it('registers the notification address with the PSP', async () => {
		await registerPspWebhook('https://loja.test/api/v1/payments/webhooks/efi/s');
		const put = calls.findLast((c) => c.path.startsWith('/v2/webhook/'))!;
		expect(put.path).toBe(`/v2/webhook/${encodeURIComponent('pix@loja.test')}`);
		expect(JSON.parse(put.body!).webhookUrl).toMatch(/\?hmac=[0-9a-f]{32}&ignorar=$/);
	});
});
