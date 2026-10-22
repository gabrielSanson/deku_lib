// Mercado Pago (https://www.mercadopago.com.br/developers). Pix is a direct
// payment with a "copia e cola" code; card goes through Checkout Pro, the
// hosted page, so card numbers never touch this server. Every payment carries
// our own reference as external_reference, and that reference is what the
// tender stores: one card checkout can see several attempts (a declined card,
// then an approved one) and they all map back to the same tender.
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { PaymentProvider, ProviderPaymentStatus } from './provider';

const API = 'https://api.mercadopago.com';
const CHECKOUT_MINUTES = 30;

export interface MercadoPagoOptions {
	accessToken: string;
	/** "Assinatura secreta" of the webhook, from Suas integrações → Webhooks. */
	webhookSecret?: string;
	fetch?: typeof fetch;
}

interface MpPayment {
	id: number;
	status: string;
	external_reference: string | null;
	date_created?: string;
	point_of_interaction?: { transaction_data?: { qr_code?: string } };
}

/** Mercado Pago payment status → ours. */
export function mapMpStatus(status: string): ProviderPaymentStatus {
	switch (status) {
		case 'approved':
			return 'paid';
		case 'rejected':
			return 'failed';
		case 'cancelled':
			return 'cancelled';
		case 'refunded':
		case 'charged_back':
			return 'refunded';
		default:
			// pending, in_process, authorized, in_mediation
			return 'pending';
	}
}

/**
 * Checks the x-signature header: HMAC-SHA256 of
 * "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" with the webhook secret.
 */
export function verifyMpSignature(
	secret: string,
	dataId: string,
	headers: Headers,
	nowMs = Date.now()
): boolean {
	const parts = Object.fromEntries(
		(headers.get('x-signature') ?? '').split(',').map((p) => {
			const [k, ...v] = p.trim().split('=');
			return [k, v.join('=')];
		})
	);
	const ts = parts.ts;
	const v1 = parts.v1;
	if (!ts || !v1) return false;
	// Refuse replays of old notifications (ts is in milliseconds; allow 15 minutes).
	if (Math.abs(nowMs - Number(ts)) > 15 * 60_000) return false;
	const requestId = headers.get('x-request-id');
	let manifest = `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
	if (requestId) manifest += `request-id:${requestId};`;
	manifest += `ts:${ts};`;
	const expected = createHmac('sha256', secret).update(manifest).digest('hex');
	return v1.length === expected.length && timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
}

function notificationBody(
	rawBody: Uint8Array
): { type?: string; action?: string; data?: { id?: unknown } } | null {
	try {
		return JSON.parse(new TextDecoder().decode(rawBody));
	} catch {
		return null;
	}
}

/** The most telling payment for one of our references: an approved one wins, else the newest. */
function pickPayment(payments: MpPayment[]): MpPayment | undefined {
	return (
		payments.find((p) => p.status === 'approved') ??
		[...payments].sort((a, b) => (b.date_created ?? '').localeCompare(a.date_created ?? ''))[0]
	);
}

export function mercadoPagoProvider(opts: MercadoPagoOptions): PaymentProvider {
	const f = opts.fetch ?? fetch;

	async function call<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}) {
		const res = await f(`${API}${path}`, {
			...init,
			headers: {
				authorization: `Bearer ${opts.accessToken}`,
				'content-type': 'application/json',
				...(init.idempotencyKey ? { 'x-idempotency-key': init.idempotencyKey } : {})
			}
		});
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			// Never log the token; the response body has no secrets.
			console.error(
				JSON.stringify({
					msg: 'mercadopago request failed',
					path,
					status: res.status,
					body: text.slice(0, 500)
				})
			);
			throw new Error(`Mercado Pago respondeu ${res.status}`);
		}
		return (await res.json()) as T;
	}

	async function paymentsFor(reference: string) {
		const r = await call<{ results: MpPayment[] }>(
			`/v1/payments/search?external_reference=${encodeURIComponent(reference)}&sort=date_created&criteria=desc`
		);
		return r.results ?? [];
	}

	return {
		name: 'mercadopago',
		methods: ['pix', 'online_card'],

		async createCheckout(req) {
			const reference = `deku_${req.orderNumber}_${randomUUID().slice(0, 8)}`;
			const expiresAt = new Date(Date.now() + CHECKOUT_MINUTES * 60_000);
			const amount = Number((req.amountCents / 100).toFixed(2));
			const origin = new URL(req.returnUrl).origin;
			// Mercado Pago only calls public https addresses back.
			const https = origin.startsWith('https://');
			const notificationUrl = https ? `${origin}/api/v1/payments/webhooks/mercadopago` : undefined;
			const description = `Pedido #${req.orderNumber}`;

			if (req.method === 'pix') {
				const [first, ...rest] = req.customer.name.trim().split(/\s+/);
				const p = await call<MpPayment>('/v1/payments', {
					method: 'POST',
					idempotencyKey: req.idempotencyKey,
					body: JSON.stringify({
						transaction_amount: amount,
						description,
						payment_method_id: 'pix',
						external_reference: reference,
						notification_url: notificationUrl,
						date_of_expiration: expiresAt.toISOString().replace('Z', '+00:00'),
						payer: {
							// Pix needs a payer e-mail; customers may leave it blank.
							email: req.customer.email || `pedido${req.orderNumber}@deku.burger`,
							first_name: first || 'Cliente',
							last_name: rest.join(' ') || undefined
						}
					})
				});
				const pixCode = p.point_of_interaction?.transaction_data?.qr_code;
				if (!pixCode) throw new Error('Mercado Pago não devolveu o código Pix');
				return { providerPaymentId: reference, expiresAt, pixCode };
			}

			const pref = await call<{ init_point: string }>('/checkout/preferences', {
				method: 'POST',
				idempotencyKey: req.idempotencyKey,
				body: JSON.stringify({
					items: [
						{
							id: req.orderId,
							title: description,
							quantity: 1,
							currency_id: 'BRL',
							unit_price: amount
						}
					],
					payer: { name: req.customer.name, email: req.customer.email || undefined },
					external_reference: reference,
					notification_url: notificationUrl,
					back_urls: { success: req.returnUrl, failure: req.returnUrl, pending: req.returnUrl },
					auto_return: https ? 'approved' : undefined,
					// Card only (credit or debit), paid in one go, approved or declined on the spot.
					binary_mode: true,
					payment_methods: {
						excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }],
						installments: 1
					},
					expires: true,
					expiration_date_to: expiresAt.toISOString().replace('Z', '+00:00'),
					statement_descriptor: 'DEKU BURGER'
				})
			});
			return { providerPaymentId: reference, expiresAt, redirectUrl: pref.init_point };
		},

		async getStatus(reference) {
			const p = pickPayment(await paymentsFor(reference));
			return p ? mapMpStatus(p.status) : 'pending';
		},

		async verifyWebhook(rawBody, headers) {
			if (!opts.webhookSecret) {
				console.warn(
					JSON.stringify({ msg: 'MERCADOPAGO_WEBHOOK_SECRET missing; webhook refused' })
				);
				return false;
			}
			const id = notificationBody(rawBody)?.data?.id;
			return id != null && verifyMpSignature(opts.webhookSecret, String(id), headers);
		},

		async parseWebhook(rawBody) {
			const body = notificationBody(rawBody);
			// Merchant orders, chargebacks etc. carry nothing we act on.
			if (!body || body.type !== 'payment' || body.data?.id == null) return null;
			// The notification only names the payment; its state comes from the API.
			const p = await call<MpPayment>(`/v1/payments/${encodeURIComponent(String(body.data.id))}`);
			if (!p.external_reference) return null;
			const status = mapMpStatus(p.status);
			return {
				// One row per payment state, so a later change (refund) is not dropped as a duplicate.
				eventId: `${p.id}:${p.status}`,
				eventType: body.action ?? 'payment',
				providerPaymentId: p.external_reference,
				status
			};
		},

		async refund(reference, amountCents, idempotencyKey) {
			const p = (await paymentsFor(reference)).find((x) => x.status === 'approved');
			if (!p) throw new Error('Nenhum pagamento aprovado para estornar');
			await call(`/v1/payments/${p.id}/refunds`, {
				method: 'POST',
				idempotencyKey,
				body: JSON.stringify({ amount: Number((amountCents / 100).toFixed(2)) })
			});
		}
	};
}
