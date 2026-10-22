import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { mapMpStatus, mercadoPagoProvider, verifyMpSignature } from './mercadopago';

const SECRET = 'test-webhook-secret';

function signed(dataId: string, ts = Date.now(), requestId = 'req-1') {
	const v1 = createHmac('sha256', SECRET)
		.update(`id:${dataId};request-id:${requestId};ts:${ts};`)
		.digest('hex');
	return new Headers({ 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId });
}

function fakeFetch(routes: Record<string, unknown>) {
	const calls: { url: string; init?: RequestInit }[] = [];
	const f = (async (url: string, init?: RequestInit) => {
		calls.push({ url, init });
		const key = Object.keys(routes).find((k) => url.includes(k));
		if (!key) return new Response('not found', { status: 404 });
		return new Response(JSON.stringify(routes[key]), { status: 200 });
	}) as typeof fetch;
	return { f, calls };
}

const body = (o: unknown) => new TextEncoder().encode(JSON.stringify(o));

describe('mercado pago', () => {
	it('maps payment statuses', () => {
		expect(mapMpStatus('approved')).toBe('paid');
		expect(mapMpStatus('in_process')).toBe('pending');
		expect(mapMpStatus('rejected')).toBe('failed');
		expect(mapMpStatus('cancelled')).toBe('cancelled');
		expect(mapMpStatus('refunded')).toBe('refunded');
		expect(mapMpStatus('charged_back')).toBe('refunded');
	});

	it('accepts a valid signature and refuses tampered, missing or old ones', () => {
		expect(verifyMpSignature(SECRET, '123', signed('123'))).toBe(true);
		expect(verifyMpSignature(SECRET, '124', signed('123'))).toBe(false);
		expect(verifyMpSignature('other', '123', signed('123'))).toBe(false);
		expect(verifyMpSignature(SECRET, '123', new Headers())).toBe(false);
		const old = Date.now() - 60 * 60_000;
		expect(verifyMpSignature(SECRET, '123', signed('123', old))).toBe(false);
	});

	it('refuses webhooks when no secret is configured', async () => {
		const p = mercadoPagoProvider({ accessToken: 't', fetch: fakeFetch({}).f });
		expect(await p.verifyWebhook(body({ data: { id: '1' } }), signed('1'))).toBe(false);
	});

	it('creates a Pix payment with our reference and returns the copia e cola code', async () => {
		const { f, calls } = fakeFetch({
			'/v1/payments': {
				id: 99,
				status: 'pending',
				point_of_interaction: { transaction_data: { qr_code: '000201PIX' } }
			}
		});
		const p = mercadoPagoProvider({ accessToken: 'tok', fetch: f });
		const r = await p.createCheckout({
			orderId: 'o1',
			orderNumber: 1001,
			amountCents: 3990,
			method: 'pix',
			idempotencyKey: 'k1',
			customer: { name: 'Ana Souza' },
			returnUrl: 'https://pedido.example.com/checkout/payment/abc'
		});
		expect(r.pixCode).toBe('000201PIX');
		expect(r.providerPaymentId).toMatch(/^deku_1001_/);
		const sent = JSON.parse(String(calls[0].init?.body));
		expect(sent.transaction_amount).toBe(39.9);
		expect(sent.payment_method_id).toBe('pix');
		expect(sent.external_reference).toBe(r.providerPaymentId);
		expect(sent.notification_url).toBe(
			'https://pedido.example.com/api/v1/payments/webhooks/mercadopago'
		);
		expect((calls[0].init?.headers as Record<string, string>)['x-idempotency-key']).toBe('k1');
	});

	it('sends card payments to Checkout Pro', async () => {
		const { f, calls } = fakeFetch({ '/checkout/preferences': { init_point: 'https://mp/pay' } });
		const p = mercadoPagoProvider({ accessToken: 'tok', fetch: f });
		const r = await p.createCheckout({
			orderId: 'o1',
			orderNumber: 1002,
			amountCents: 2500,
			method: 'online_card',
			idempotencyKey: 'k2',
			customer: { name: 'Ana' },
			returnUrl: 'https://pedido.example.com/checkout/payment/abc'
		});
		expect(r.redirectUrl).toBe('https://mp/pay');
		const sent = JSON.parse(String(calls[0].init?.body));
		expect(sent.external_reference).toBe(r.providerPaymentId);
		expect(sent.binary_mode).toBe(true);
	});

	it('reads the payment state from the API when a notification arrives', async () => {
		const { f } = fakeFetch({
			'/v1/payments/555': { id: 555, status: 'approved', external_reference: 'deku_1001_ab' }
		});
		const p = mercadoPagoProvider({ accessToken: 'tok', webhookSecret: SECRET, fetch: f });
		const raw = body({ type: 'payment', action: 'payment.updated', data: { id: '555' } });
		expect(await p.verifyWebhook(raw, signed('555'))).toBe(true);
		expect(await p.parseWebhook(raw)).toEqual({
			eventId: '555:approved',
			eventType: 'payment.updated',
			providerPaymentId: 'deku_1001_ab',
			status: 'paid'
		});
		expect(await p.parseWebhook(body({ type: 'merchant_order', data: { id: '1' } }))).toBeNull();
	});

	it('prefers an approved attempt when checking a reference', async () => {
		const { f } = fakeFetch({
			'/v1/payments/search': {
				results: [
					{
						id: 2,
						status: 'rejected',
						external_reference: 'r',
						date_created: '2026-10-22T10:05:00Z'
					},
					{
						id: 1,
						status: 'approved',
						external_reference: 'r',
						date_created: '2026-10-22T10:00:00Z'
					}
				]
			}
		});
		const p = mercadoPagoProvider({ accessToken: 'tok', fetch: f });
		expect(await p.getStatus('r')).toBe('paid');
	});
});
