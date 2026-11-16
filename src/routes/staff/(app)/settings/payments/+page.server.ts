// How the site gets paid: the shop's own Pix key, plus the online payment provider (PSP).
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { config } from '#lib/server/config.ts';
import { currentShopId } from '#lib/server/db.ts';
import { hasShopSecret } from '#lib/server/platform/secrets.ts';
import {
	paymentProvider,
	paymentSettings,
	savePaymentSettings,
	type OnlineMethod,
	type ProviderName
} from '#lib/server/payments/provider.ts';
import { canStoreSecrets } from '#lib/server/secrets.ts';
import { getStoreProfile, savePixSettings } from '#lib/server/settings/profile.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
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
		webhookUrl: `${event.url.origin}/api/v1/payments/webhooks/mercadopago/${currentShopId()}`
	};
};

export const actions: Actions = {
	payments: async (event) => {
		const staff = requireStaff(event, ADMIN);
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
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const provider = String(d.get('provider') ?? 'none') as ProviderName;
		const methods = d.getAll('methods').map(String) as OnlineMethod[];
		return attempt(async () => {
			await savePaymentSettings(
				{
					provider: ['none', 'mercadopago', 'local_stub'].includes(provider) ? provider : 'none',
					methods,
					accessToken: formString(d, 'accessToken'),
					webhookSecret: formString(d, 'webhookSecret')
				},
				staffActor(staff)
			);
			return { ok: 'online' as const };
		});
	}
};
