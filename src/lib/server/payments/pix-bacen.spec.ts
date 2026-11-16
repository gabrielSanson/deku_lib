import { describe, expect, it } from 'vitest';
import { mapCobStatus, pixBacenProvider, txidFor, type Transport } from './pix-bacen';

function fake(routes: Record<string, (body?: string) => { status: number; body: unknown }>) {
	const calls: { method: string; url: string; headers: Record<string, string>; body?: string }[] =
		[];
	const transport: Transport = async (method, url, headers, body) => {
		calls.push({ method, url, headers, body });
		const path = new URL(url).pathname;
		const key = Object.keys(routes).find((k) => `${method} ${path}`.startsWith(k));
		if (!key) return { status: 404, body: '' };
		const r = routes[key](body);
		return { status: r.status, body: JSON.stringify(r.body) };
	};
	return { transport, calls };
}

const base = {
	name: 'efi',
	baseUrl: 'https://psp.test',
	clientId: 'id',
	clientSecret: 'secret',
	pixKey: 'chave@loja.test',
	webhookToken: 'tok123'
};

describe('Pix API (BACEN) provider', () => {
	it('derives a stable txid of 32 letters and digits', () => {
		expect(txidFor('k1')).toMatch(/^[0-9a-f]{32}$/);
		expect(txidFor('k1')).toBe(txidFor('k1'));
	});

	it('maps charge states', () => {
		expect(mapCobStatus({ status: 'ATIVA' })).toBe('pending');
		expect(mapCobStatus({ status: 'CONCLUIDA' })).toBe('paid');
		expect(mapCobStatus({ status: 'REMOVIDA_PELO_PSP' })).toBe('cancelled');
		expect(
			mapCobStatus({ status: 'CONCLUIDA', pix: [{ devolucoes: [{ status: 'DEVOLVIDO' }] }] })
		).toBe('refunded');
	});

	it('creates a charge with the amount, key and expiry, signing in once', async () => {
		const { transport, calls } = fake({
			'POST /oauth/token': () => ({ status: 200, body: { access_token: 'at', expires_in: 3600 } }),
			'PUT /v2/cob/': () => ({ status: 201, body: { status: 'ATIVA', pixCopiaECola: '000201PIX' } })
		});
		const p = pixBacenProvider({ ...base, transport });
		const r = await p.createCheckout({
			orderId: 'o',
			orderNumber: 1042,
			amountCents: 4590,
			method: 'pix',
			idempotencyKey: 'pay:abc',
			customer: { name: 'Ana' },
			returnUrl: 'https://x'
		});
		expect(r.pixCode).toBe('000201PIX');
		expect(r.providerPaymentId).toBe(txidFor('pay:abc'));
		const put = calls.find((c) => c.method === 'PUT')!;
		expect(JSON.parse(put.body!)).toMatchObject({
			calendario: { expiracao: 900 },
			valor: { original: '45.90' },
			chave: 'chave@loja.test'
		});
		expect(put.headers.authorization).toBe('Bearer at');
		await p.getStatus(r.providerPaymentId).catch(() => {});
		expect(calls.filter((c) => c.url.endsWith('/oauth/token'))).toHaveLength(1);
	});

	it('accepts a notification only with our token and reads the real status', async () => {
		const { transport } = fake({
			'POST /oauth/token': () => ({ status: 200, body: { access_token: 'at' } }),
			'GET /v2/cob/tx1': () => ({ status: 200, body: { status: 'CONCLUIDA' } })
		});
		const p = pixBacenProvider({ ...base, transport });
		const raw = new TextEncoder().encode(
			JSON.stringify({ pix: [{ txid: 'tx1', endToEndId: 'E1' }] })
		);
		expect(
			await p.verifyWebhook(raw, new Headers(), new URL('https://s/x?hmac=tok123&ignorar=/pix'))
		).toBe(true);
		expect(await p.verifyWebhook(raw, new Headers(), new URL('https://s/x?hmac=nope'))).toBe(false);
		expect(await p.parseWebhook(raw)).toEqual({
			eventId: 'E1:paid',
			eventType: 'pix',
			providerPaymentId: 'tx1',
			status: 'paid'
		});
	});

	it('registers the webhook with the token and the ignorar suffix', async () => {
		const { transport, calls } = fake({
			'POST /oauth/token': () => ({ status: 200, body: { access_token: 'at' } }),
			'PUT /v2/webhook/': () => ({ status: 200, body: {} })
		});
		await pixBacenProvider({ ...base, transport }).registerWebhook(
			'https://loja.test/api/v1/payments/webhooks/efi/s1'
		);
		const put = calls.find((c) => c.method === 'PUT')!;
		expect(JSON.parse(put.body!).webhookUrl).toBe(
			'https://loja.test/api/v1/payments/webhooks/efi/s1?hmac=tok123&ignorar='
		);
	});
});
