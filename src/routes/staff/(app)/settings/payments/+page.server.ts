// How the site gets paid: the shop's own Pix key, plus the status of the online
// payment provider (PSP) when one is connected.
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { config } from '#lib/server/config.ts';
import { paymentProvider } from '#lib/server/payments/provider.ts';
import { getStoreProfile, savePixSettings } from '#lib/server/settings/profile.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const c = config();
	return {
		profile: await getStoreProfile(undefined, { fresh: true }),
		paymentProvider: c.PAYMENT_PROVIDER,
		webhookSecretSet: !!c.MERCADOPAGO_WEBHOOK_SECRET
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
					!pixEnabled && !paymentProvider()
						? 'Sem Pix, o site não tem como receber pagamento e não aceita pedidos. Os pedidos do balcão continuam funcionando.'
						: null
			};
		});
	}
};
