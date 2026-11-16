// Provider-neutral online payments. Each shop picks its PSP (payment_settings):
// mercadopago (Pix + card), none (online checkout off; Pix to the shop's key
// still works), or local_stub (development and tests only). A single-shop install
// with no saved choice follows PAYMENT_PROVIDER in .env. Another PSP is one more
// implementation of this interface.
import { config } from '../config';
import { currentShopId, db, DEFAULT_SHOP_ID } from '../db';
import { audit, type Actor } from '../audit';
import { DomainError } from '../errors';
import { getShopSecret, hasShopSecret, setShopSecret } from '../platform/secrets';
import { canStoreSecrets } from '../secrets';
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
	/** `url` is the notification URL; some providers sign values from its query string. */
	verifyWebhook(rawBody: Uint8Array, headers: Headers, url?: URL): Promise<boolean>;
	/** null for notifications that need no action. */
	parseWebhook(rawBody: Uint8Array): Promise<ParsedWebhook | null>;
	refund(providerPaymentId: string, amountCents: number, idempotencyKey: string): Promise<void>;
}

const mpByToken = new Map<string, PaymentProvider>();

export type ProviderName = 'none' | 'mercadopago' | 'local_stub';

export interface ShopPaymentSettings {
	provider: ProviderName;
	methods: OnlineMethod[];
	/** 'shop' when saved in Configurações → Pagamentos, 'env' when it comes from .env. */
	source: 'shop' | 'env' | 'none';
	accessToken: string | null;
	webhookSecret: string | null;
}

/** The current shop's online payment choice and keys. */
export async function paymentSettings(): Promise<ShopPaymentSettings> {
	const c = config();
	const [row] = await db()<{ provider: ProviderName; methods: OnlineMethod[] }[]>`
		select provider, methods from payment_settings where shop_id = current_shop_id()`;
	if (row) {
		const mp = row.provider === 'mercadopago';
		return {
			provider: row.provider,
			methods: row.methods,
			source: 'shop',
			accessToken: mp ? await getShopSecret('mercadopago_token') : null,
			webhookSecret: mp ? await getShopSecret('mercadopago_webhook') : null
		};
	}
	if (currentShopId() === DEFAULT_SHOP_ID) {
		return {
			provider: c.PAYMENT_PROVIDER,
			methods: ['pix', 'online_card'],
			source: c.PAYMENT_PROVIDER === 'none' ? 'none' : 'env',
			accessToken: c.MERCADOPAGO_ACCESS_TOKEN ?? null,
			webhookSecret: c.MERCADOPAGO_WEBHOOK_SECRET ?? null
		};
	}
	return { provider: 'none', methods: [], source: 'none', accessToken: null, webhookSecret: null };
}

function restrict(p: PaymentProvider, methods: OnlineMethod[]): PaymentProvider {
	const allowed = p.methods.filter((m) => methods.includes(m));
	return allowed.length === p.methods.length ? p : { ...p, methods: allowed };
}

/** The current shop's online payment provider, or null when it takes no online payments. */
export async function paymentProvider(): Promise<PaymentProvider | null> {
	const s = await paymentSettings();
	switch (s.provider) {
		case 'local_stub':
			if (config().NODE_ENV === 'production') return null;
			return restrict(localStubProvider, s.methods);
		case 'mercadopago': {
			if (!s.accessToken) return null;
			const key = `${s.accessToken}|${s.webhookSecret ?? ''}`;
			let p = mpByToken.get(key);
			if (!p) {
				p = mercadoPagoProvider({
					accessToken: s.accessToken,
					webhookSecret: s.webhookSecret ?? undefined
				});
				mpByToken.set(key, p);
			}
			return restrict(p, s.methods);
		}
		default:
			return null;
	}
}

export async function providerByName(name: string): Promise<PaymentProvider | null> {
	const p = await paymentProvider();
	return p && p.name === name ? p : null;
}

export interface PaymentSettingsInput {
	provider: ProviderName;
	methods: OnlineMethod[];
	/** Blank keeps the saved key. */
	accessToken?: string | null;
	webhookSecret?: string | null;
}

/** Saves the current shop's online payment choice. Keys are encrypted (shop_secrets). */
export async function savePaymentSettings(input: PaymentSettingsInput, actor: Actor) {
	if (input.provider === 'local_stub' && config().NODE_ENV === 'production') {
		throw new DomainError('err.payments.stubInProduction');
	}
	const methods = input.methods.filter((m) => m === 'pix' || m === 'online_card');
	if (input.provider !== 'none' && methods.length === 0) {
		throw new DomainError('err.payments.noMethod');
	}
	const token = input.accessToken?.trim() || null;
	const secret = input.webhookSecret?.trim() || null;
	if (input.provider === 'mercadopago') {
		if (!canStoreSecrets()) {
			throw new DomainError('err.settings.appSecret', { code: 'no_app_secret', status: 501 });
		}
		if (!token && !(await hasShopSecret('mercadopago_token'))) {
			throw new DomainError('err.payments.noToken');
		}
	}
	if (token) await setShopSecret('mercadopago_token', token);
	if (secret) await setShopSecret('mercadopago_webhook', secret);
	await db().begin(async (tx) => {
		await tx`
			insert into payment_settings (provider, methods, updated_by, updated_at)
			values (${input.provider}, ${methods}, ${actor.id}, now())
			on conflict (shop_id) do update set provider = excluded.provider, methods = excluded.methods,
				updated_by = excluded.updated_by, updated_at = now()`;
		await audit(tx, actor, 'payments.settings_saved', 'payment_settings', null, {
			provider: input.provider,
			methods,
			token_changed: Boolean(token),
			webhook_secret_changed: Boolean(secret)
		});
	});
}
