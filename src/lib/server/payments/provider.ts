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
import { randomBytes } from 'node:crypto';
import { EFI_BASE, mtlsTransport, pixBacenProvider, type Transport } from './pix-bacen';

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

export type ProviderName = 'none' | 'mercadopago' | 'local_stub' | 'efi';

export interface PspPixSettings {
	clientId: string | null;
	pixKey: string | null;
	sandbox: boolean;
	hasSecret: boolean;
	hasCert: boolean;
	webhookAt: Date | null;
}

export interface ShopPaymentSettings {
	provider: ProviderName;
	methods: OnlineMethod[];
	/** 'shop' when saved in Configurações → Pagamentos, 'env' when it comes from .env. */
	source: 'shop' | 'env' | 'none';
	accessToken: string | null;
	webhookSecret: string | null;
	/** Efí (Pix API) details, when chosen. */
	psp?: PspPixSettings;
}

/** The current shop's online payment choice and keys. */
export async function paymentSettings(): Promise<ShopPaymentSettings> {
	const c = config();
	const [row] = await db()<
		{
			provider: ProviderName;
			methods: OnlineMethod[];
			psp_client_id: string | null;
			psp_pix_key: string | null;
			psp_sandbox: boolean;
			psp_webhook_at: Date | null;
		}[]
	>`
		select provider, methods, psp_client_id, psp_pix_key, psp_sandbox, psp_webhook_at
		from payment_settings where shop_id = current_shop_id()`;
	if (row) {
		const mp = row.provider === 'mercadopago';
		return {
			provider: row.provider,
			methods: row.methods,
			source: 'shop',
			accessToken: mp ? await getShopSecret('mercadopago_token') : null,
			webhookSecret: mp ? await getShopSecret('mercadopago_webhook') : null,
			psp: {
				clientId: row.psp_client_id,
				pixKey: row.psp_pix_key,
				sandbox: row.psp_sandbox,
				hasSecret: await hasShopSecret('efi_client_secret'),
				hasCert: await hasShopSecret('psp_pix_cert'),
				webhookAt: row.psp_webhook_at
			}
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
		case 'efi':
			return efiProvider(s);
		default:
			return null;
	}
}

let pixTransportOverride: Transport | null = null;
/** Tests: talk to a fake PSP instead of opening mutual TLS. */
export function setPixTransportForTests(t: Transport | null) {
	pixTransportOverride = t;
	efiByKey.clear();
}
const efiByKey = new Map<string, ReturnType<typeof pixBacenProvider>>();

async function efiProvider(s: ShopPaymentSettings) {
	const psp = s.psp;
	if (!psp?.clientId || !psp.pixKey) return null;
	const [secret, cert, pass, hook] = await Promise.all([
		getShopSecret('efi_client_secret'),
		getShopSecret('psp_pix_cert'),
		getShopSecret('psp_pix_cert_pass'),
		getShopSecret('efi_webhook')
	]);
	if (!secret || !hook || (!cert && !pixTransportOverride)) return null;
	const key = [currentShopId(), psp.clientId, psp.pixKey, psp.sandbox, secret.length, hook].join(
		'|'
	);
	let p = efiByKey.get(key);
	if (!p) {
		p = pixBacenProvider({
			name: 'efi',
			baseUrl: psp.sandbox ? EFI_BASE.sandbox : EFI_BASE.production,
			clientId: psp.clientId,
			clientSecret: secret,
			pixKey: psp.pixKey,
			webhookToken: hook,
			transport:
				pixTransportOverride ?? mtlsTransport(Buffer.from(cert!, 'base64'), pass ?? undefined)
		});
		efiByKey.set(key, p);
	}
	return p;
}

/** Tells the PSP where to send Pix notifications for this shop. */
export async function registerPspWebhook(url: string) {
	const p = await efiProvider(await paymentSettings());
	if (!p) throw new DomainError('err.payments.pspMissing');
	await p.registerWebhook(url);
	await db()`update payment_settings set psp_webhook_at = now() where shop_id = current_shop_id()`;
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
	/** Efí: blank secret, certificate or password keeps the saved one. */
	psp?: {
		clientId: string;
		clientSecret?: string | null;
		pixKey: string;
		sandbox: boolean;
		/** The .p12 file, base64. */
		certificate?: string | null;
		certificatePassword?: string | null;
	};
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
	const psp = input.provider === 'efi' ? input.psp : undefined;
	if (input.provider === 'efi') {
		if (!canStoreSecrets()) {
			throw new DomainError('err.settings.appSecret', { code: 'no_app_secret', status: 501 });
		}
		if (!psp?.clientId.trim() || !psp.pixKey.trim())
			throw new DomainError('err.payments.pspMissing');
		if (methods.includes('online_card')) throw new DomainError('err.payments.pspPixOnly');
		if (psp.clientSecret?.trim()) await setShopSecret('efi_client_secret', psp.clientSecret.trim());
		if (psp.certificate) await setShopSecret('psp_pix_cert', psp.certificate);
		if (psp.certificatePassword?.trim())
			await setShopSecret('psp_pix_cert_pass', psp.certificatePassword.trim());
		if (!(await hasShopSecret('efi_client_secret')) || !(await hasShopSecret('psp_pix_cert')))
			throw new DomainError('err.payments.pspMissing');
		if (!(await hasShopSecret('efi_webhook')))
			await setShopSecret('efi_webhook', randomBytes(16).toString('hex'));
	}
	if (token) await setShopSecret('mercadopago_token', token);
	if (secret) await setShopSecret('mercadopago_webhook', secret);
	await db().begin(async (tx) => {
		await tx`
			insert into payment_settings (provider, methods, updated_by, updated_at, psp_client_id,
				psp_pix_key, psp_sandbox)
			values (${input.provider}, ${methods}, ${actor.id}, now(), ${psp?.clientId.trim() ?? null},
				${psp?.pixKey.trim() ?? null}, ${psp?.sandbox ?? false})
			on conflict (shop_id) do update set provider = excluded.provider, methods = excluded.methods,
				updated_by = excluded.updated_by, updated_at = now(),
				psp_client_id = coalesce(excluded.psp_client_id, payment_settings.psp_client_id),
				psp_pix_key = coalesce(excluded.psp_pix_key, payment_settings.psp_pix_key),
				psp_sandbox = case when excluded.provider = 'efi' then excluded.psp_sandbox
					else payment_settings.psp_sandbox end`;
		await audit(tx, actor, 'payments.settings_saved', 'payment_settings', null, {
			provider: input.provider,
			methods,
			token_changed: Boolean(token),
			webhook_secret_changed: Boolean(secret)
		});
	});
}
