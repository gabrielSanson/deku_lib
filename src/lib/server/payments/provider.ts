// Provider-neutral online payments. PAYMENT_PROVIDER picks the PSP:
// mercadopago (Pix + card), none (online checkout off; Pix to the shop's key
// still works), or local_stub (development and tests only). Another PSP is one
// more implementation of this interface.
import { config } from '../config';
import { localStubProvider } from './local-stub';
import { mercadoPagoProvider } from './mercadopago';

export type OnlineMethod = 'pix' | 'online_card';

export interface CheckoutRequest {
	orderId: string;
	orderNumber: number;
	amountCents: number;
	method: OnlineMethod;
	idempotencyKey: string;
	customer: { name: string; email?: string | null; phoneE164?: string | null };
	returnUrl: string;
}

export interface CheckoutResult {
	providerPaymentId: string;
	expiresAt: Date;
	/** Pix "copia e cola" payload, when method is pix. */
	pixCode?: string;
	/** Hosted card checkout page, when method is online_card. */
	redirectUrl?: string;
}

export type ProviderPaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export interface ParsedWebhook {
	eventId: string;
	eventType: string;
	providerPaymentId: string;
	status: ProviderPaymentStatus;
}

export interface PaymentProvider {
	name: string;
	methods: OnlineMethod[];
	createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
	getStatus(providerPaymentId: string): Promise<ProviderPaymentStatus>;
	/** Must use the raw request body bytes, before any JSON parsing. */
	verifyWebhook(rawBody: Uint8Array, headers: Headers): Promise<boolean>;
	/** null for notifications that need no action. */
	parseWebhook(rawBody: Uint8Array): Promise<ParsedWebhook | null>;
	refund(providerPaymentId: string, amountCents: number, idempotencyKey: string): Promise<void>;
}

let mp: { token: string; provider: PaymentProvider } | undefined;

export function paymentProvider(): PaymentProvider | null {
	const c = config();
	switch (c.PAYMENT_PROVIDER) {
		case 'local_stub':
			return localStubProvider;
		case 'mercadopago': {
			const token = c.MERCADOPAGO_ACCESS_TOKEN!;
			if (mp?.token !== token)
				mp = {
					token,
					provider: mercadoPagoProvider({
						accessToken: token,
						webhookSecret: c.MERCADOPAGO_WEBHOOK_SECRET
					})
				};
			return mp.provider;
		}
		default:
			return null;
	}
}

export function providerByName(name: string): PaymentProvider | null {
	const p = paymentProvider();
	return p && p.name === name ? p : null;
}
