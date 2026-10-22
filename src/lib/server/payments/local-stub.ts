// Development-only payment provider. It never moves money: a payment is
// "approved" by calling /dev/payments/<id>/approve, which sends a signed
// webhook exactly like a real PSP would. config() refuses it in production.
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { PaymentProvider, ProviderPaymentStatus } from './provider';

export const STUB_SECRET = 'local-stub-webhook-secret';
const statuses = new Map<string, ProviderPaymentStatus>();

export function signStub(body: string) {
	return createHmac('sha256', STUB_SECRET).update(body).digest('hex');
}

export const localStubProvider: PaymentProvider = {
	name: 'local_stub',
	methods: ['pix', 'online_card'],
	async createCheckout(req) {
		const id = `stub_${randomUUID()}`;
		statuses.set(id, 'pending');
		const expiresAt = new Date(Date.now() + 15 * 60_000);
		if (req.method === 'pix') {
			const amount = (req.amountCents / 100).toFixed(2);
			return {
				providerPaymentId: id,
				expiresAt,
				pixCode: `00020126580014BR.GOV.BCB.PIX0136${id.slice(5, 41)}520400005303986540${amount.length}${amount}5802BR5913DEKU BURGER6009SAO PAULO62070503***6304TEST`
			};
		}
		return {
			providerPaymentId: id,
			expiresAt,
			redirectUrl: `/dev/payments/card?payment=${id}&return=${encodeURIComponent(req.returnUrl)}`
		};
	},
	async getStatus(id) {
		return statuses.get(id) ?? 'pending';
	},
	async verifyWebhook(rawBody, headers) {
		const given = headers.get('x-stub-signature') ?? '';
		const expected = signStub(new TextDecoder().decode(rawBody));
		return (
			given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
		);
	},
	async parseWebhook(rawBody) {
		const body = JSON.parse(new TextDecoder().decode(rawBody)) as {
			id: string;
			type: string;
			payment_id: string;
			status: ProviderPaymentStatus;
		};
		statuses.set(body.payment_id, body.status);
		return {
			eventId: body.id,
			eventType: body.type,
			providerPaymentId: body.payment_id,
			status: body.status
		};
	},
	async refund(id) {
		statuses.set(id, 'refunded');
	}
};
