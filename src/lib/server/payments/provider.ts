// Provider-neutral online payments. The real PSP (Mercado Pago, Pagar.me,
// Stripe BR, Asaas, …) is a launch decision; implement this interface for it.
// Until then PAYMENT_PROVIDER=none keeps online checkout off, and the local
// stub exists only for development and tests.
import { config } from '../config';
import { localStubProvider } from './local-stub';

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
	parseWebhook(rawBody: Uint8Array): ParsedWebhook;
	refund(providerPaymentId: string, amountCents: number, idempotencyKey: string): Promise<void>;
}

export function paymentProvider(): PaymentProvider | null {
	switch (config().PAYMENT_PROVIDER) {
		case 'local_stub':
			return localStubProvider;
		default:
			return null;
	}
}

export function providerByName(name: string): PaymentProvider | null {
	const p = paymentProvider();
	return p && p.name === name ? p : null;
}
