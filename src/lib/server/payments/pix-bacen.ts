// Automatic Pix through a PSP that follows the Banco Central Pix API (API Pix v2): a charge per
// order (PUT /v2/cob/{txid}), its status (GET /v2/cob/{txid}), the webhook (PUT /v2/webhook/{chave})
// and refunds (PUT /v2/pix/{e2eid}/devolucao/{id}). OAuth2 client credentials over mutual TLS with
// the PSP's certificate. Configured for Efí ('efi').
// [UNVERIFIED] TODO(verify): Efí's base URLs, the token body, the webhook mTLS skip header and the
// "?ignorar=" trick, and the payload field names, with one sandbox charge.
import { createHash, timingSafeEqual } from 'node:crypto';
import { request } from 'node:https';
import type { PaymentProvider, ProviderPaymentStatus } from './provider';

export const EFI_BASE = {
	production: 'https://pix.api.efipay.com.br',
	sandbox: 'https://pix-h.api.efipay.com.br'
} as const;

/** Seconds a charge stays payable (the order's own deadline still applies). */
export const PIX_CHARGE_SECONDS = 15 * 60;

export interface HttpResponse {
	status: number;
	body: string;
}
export type Transport = (
	method: string,
	url: string,
	headers: Record<string, string>,
	body?: string
) => Promise<HttpResponse>;

/** HTTPS with the PSP's client certificate (.p12). */
export function mtlsTransport(pfx: Buffer, passphrase?: string): Transport {
	return (method, url, headers, body) =>
		new Promise((resolve, reject) => {
			const req = request(url, { method, headers, pfx, passphrase, timeout: 10_000 }, (res) => {
				const chunks: Buffer[] = [];
				res.on('data', (c: Buffer) => chunks.push(c));
				res.on('end', () =>
					resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') })
				);
			});
			req.on('timeout', () => req.destroy(new Error('PSP request timed out')));
			req.on('error', reject);
			if (body) req.write(body);
			req.end();
		});
}

export class PixApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly body: string
	) {
		super(message);
	}
}

export interface PixBacenOptions {
	name: string;
	baseUrl: string;
	clientId: string;
	clientSecret: string;
	/** The Pix key registered at the PSP that receives the charges. */
	pixKey: string;
	/** Secret token we put in the webhook URL (?hmac=), checked on every notification. */
	webhookToken: string;
	transport: Transport;
}

/** A txid (26–35 letters and digits) derived from our idempotency key, so retries reuse it. */
export function txidFor(key: string): string {
	return createHash('sha256').update(key).digest('hex').slice(0, 32);
}

/** BACEN charge status → ours. */
export function mapCobStatus(cob: {
	status?: string;
	pix?: { devolucoes?: { status?: string }[] }[];
}): ProviderPaymentStatus {
	const refunded = (cob.pix ?? []).some((p) =>
		(p.devolucoes ?? []).some((d) => d.status === 'DEVOLVIDO')
	);
	if (refunded) return 'refunded';
	switch (cob.status) {
		case 'CONCLUIDA':
			return 'paid';
		case 'REMOVIDA_PELO_USUARIO_RECEBEDOR':
		case 'REMOVIDA_PELO_PSP':
			return 'cancelled';
		default:
			return 'pending';
	}
}

export function pixBacenProvider(o: PixBacenOptions): PaymentProvider & {
	registerWebhook(url: string): Promise<void>;
} {
	let token: { value: string; expiresAt: number } | null = null;
	const auth = async () => {
		if (token && token.expiresAt > Date.now() + 60_000) return token.value;
		const basic = Buffer.from(`${o.clientId}:${o.clientSecret}`).toString('base64');
		const res = await o.transport(
			'POST',
			`${o.baseUrl}/oauth/token`,
			{ authorization: `Basic ${basic}`, 'content-type': 'application/json' },
			JSON.stringify({ grant_type: 'client_credentials' })
		);
		if (res.status >= 300) throw new PixApiError('PSP token request failed', res.status, res.body);
		const b = JSON.parse(res.body) as { access_token: string; expires_in?: number };
		token = { value: b.access_token, expiresAt: Date.now() + (b.expires_in ?? 3600) * 1000 };
		return token.value;
	};
	const call = async (method: string, path: string, body?: unknown, extra = {}) => {
		const res = await o.transport(
			method,
			o.baseUrl + path,
			{
				authorization: `Bearer ${await auth()}`,
				'content-type': 'application/json',
				...extra
			},
			body === undefined ? undefined : JSON.stringify(body)
		);
		if (res.status >= 300)
			throw new PixApiError(`PSP ${method} ${path} failed`, res.status, res.body);
		return res.body ? (JSON.parse(res.body) as Record<string, unknown>) : {};
	};
	type Cob = {
		status?: string;
		pixCopiaECola?: string;
		pix?: { endToEndId: string; devolucoes?: { status?: string }[] }[];
	};
	const cob = async (txid: string) => (await call('GET', `/v2/cob/${txid}`)) as Cob;

	return {
		name: o.name,
		methods: ['pix'],
		async createCheckout(req) {
			const txid = txidFor(req.idempotencyKey);
			const created = (await call('PUT', `/v2/cob/${txid}`, {
				calendario: { expiracao: PIX_CHARGE_SECONDS },
				valor: { original: (req.amountCents / 100).toFixed(2) },
				chave: o.pixKey,
				solicitacaoPagador: `Pedido ${req.orderNumber}`.slice(0, 140)
			})) as Cob;
			if (!created.pixCopiaECola) throw new PixApiError('PSP returned no Pix code', 0, '');
			return {
				providerPaymentId: txid,
				expiresAt: new Date(Date.now() + PIX_CHARGE_SECONDS * 1000),
				pixCode: created.pixCopiaECola
			};
		},
		async getStatus(txid) {
			return mapCobStatus(await cob(txid));
		},
		async verifyWebhook(_raw, _headers, url) {
			const given = url?.searchParams.get('hmac') ?? '';
			return (
				given.length === o.webhookToken.length &&
				timingSafeEqual(Buffer.from(given), Buffer.from(o.webhookToken))
			);
		},
		async parseWebhook(raw) {
			let body: { pix?: { txid?: string; endToEndId?: string }[] };
			try {
				body = JSON.parse(new TextDecoder().decode(raw));
			} catch {
				return null;
			}
			const p = (body.pix ?? []).find((x) => x.txid);
			if (!p?.txid) return null;
			// The notification only says "something happened": ask the PSP for the real status.
			const status = mapCobStatus(await cob(p.txid));
			return {
				eventId: `${p.endToEndId ?? p.txid}:${status}`,
				eventType: 'pix',
				providerPaymentId: p.txid,
				status
			};
		},
		async refund(txid, amountCents, idempotencyKey) {
			const paid = (await cob(txid)).pix?.[0];
			if (!paid) throw new PixApiError('No Pix to refund', 0, '');
			const id = idempotencyKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 35);
			await call('PUT', `/v2/pix/${paid.endToEndId}/devolucao/${id}`, {
				valor: (amountCents / 100).toFixed(2)
			});
		},
		async registerWebhook(url) {
			// The PSP appends "/pix" to the URL; "&ignorar=" swallows it into a query value.
			const target = `${url}${url.includes('?') ? '&' : '?'}hmac=${o.webhookToken}&ignorar=`;
			await call(
				'PUT',
				`/v2/webhook/${encodeURIComponent(o.pixKey)}`,
				{ webhookUrl: target },
				{ 'x-skip-mtls-checking': 'true' }
			);
		}
	};
}
