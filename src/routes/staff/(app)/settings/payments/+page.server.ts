// How the site gets paid: the shop's own Pix key, plus the online payment provider (PSP).
import { fail } from '@sveltejs/kit';
import { attempt, formString, shopText } from '#lib/server/actions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { config } from '#lib/server/config.ts';
import { currentShopId } from '#lib/server/db.ts';
import { hasShopSecret } from '#lib/server/platform/secrets.ts';
import {
	paymentProvider,
	paymentSettings,
	registerPspWebhook,
	savePaymentSettings,
	type OnlineMethod,
	type ProviderName
} from '#lib/server/payments/provider.ts';
import { canStoreSecrets } from '#lib/server/secrets.ts';
import { paymentTerms, savePaymentTerms } from '#lib/server/payments/fees.ts';
import { parseBRL } from '#lib/domain/money.ts';
import { getStoreProfile, savePixSettings } from '#lib/server/settings/profile.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'finance.edit');
	const s = await paymentSettings();
	return {
		profile: await getStoreProfile(undefined, { fresh: true }),
		paymentProvider: s.provider,
		methods: s.methods,
		source: s.source,
		webhookSecretSet: Boolean(s.webhookSecret),
		tokenSaved: await hasShopSecret('mercadopago_token'),
		canStoreSecrets: canStoreSecrets(),
		allowStub: config().NODE_ENV !== 'production',
		webhookUrl: `${event.url.origin}/api/v1/payments/webhooks/mercadopago/${currentShopId()}`,
		psp: s.psp ?? null,
		terms: await paymentTerms()
	};
};

export const actions: Actions = {
	/** Taxas: the fee per way of being paid. */
	fees: async (event) => {
		const staff = requirePermission(event, 'finance.edit');
		const d = await event.request.formData();
		const terms = (await paymentTerms()).map((term) => {
			const k = `${term.method}:${term.provider}`;
			const pct = Number(formString(d, `bps:${k}`).replace(',', '.'));
			return {
				...term,
				feeBps: Math.round(pct * 100),
				feeFixedCents: parseBRL(formString(d, `fixed:${k}`) || '0') ?? -1,
				settleDays: Number(formString(d, `days:${k}`) || '0')
			};
		});
		return attempt(async () => {
			await savePaymentTerms(terms, staffActor(staff));
			return { ok: 'fees' as const };
		});
	},
	payments: async (event) => {
		const staff = requirePermission(event, 'finance.edit');
		const d = await event.request.formData();
		const pixEnabled = d.get('pixEnabled') === 'on';
		return attempt(async () => {
			await savePixSettings(
				{
					enabled: pixEnabled,
					key: formString(d, 'pixKey'),
					merchantName: formString(d, 'pixMerchantName'),
					merchantCity: formString(d, 'pixMerchantCity')
				},
				staffActor(staff)
			);
			return {
				ok: 'payments' as const,
				warning:
					!pixEnabled && !(await paymentProvider())
						? 'Sem Pix, o site não tem como receber pagamento e não aceita pedidos. Os pedidos do balcão continuam funcionando.'
						: null
			};
		});
	},
	online: async (event) => {
		const staff = requirePermission(event, 'finance.edit');
		const d = await event.request.formData();
		const provider = String(d.get('provider') ?? 'none') as ProviderName;
		const methods = d.getAll('methods').map(String) as OnlineMethod[];
		const cert = d.get('pspCertificate');
		const certificate =
			cert instanceof File && cert.size > 0 && cert.size < 64_000
				? Buffer.from(await cert.arrayBuffer()).toString('base64')
				: null;
		return attempt(async () => {
			await savePaymentSettings(
				{
					provider: ['none', 'mercadopago', 'local_stub', 'efi'].includes(provider)
						? provider
						: 'none',
					methods,
					accessToken: formString(d, 'accessToken'),
					webhookSecret: formString(d, 'webhookSecret'),
					psp: {
						clientId: formString(d, 'pspClientId'),
						clientSecret: formString(d, 'pspClientSecret'),
						pixKey: formString(d, 'pspPixKey'),
						sandbox: d.get('pspSandbox') === 'on',
						certificate,
						certificatePassword: formString(d, 'pspCertificatePassword')
					}
				},
				staffActor(staff)
			);
			return { ok: 'online' as const };
		});
	},
	pspWebhook: async (event) => {
		requirePermission(event, 'finance.edit');
		const url = `${event.url.origin}/api/v1/payments/webhooks/efi/${currentShopId()}`;
		try {
			await registerPspWebhook(url);
			return { ok: 'online' as const };
		} catch (err) {
			const detail = String((err as { body?: string }).body || err).slice(0, 300);
			return fail(400, { error: await shopText('err.payments.webhook', { detail }) });
		}
	}
};
