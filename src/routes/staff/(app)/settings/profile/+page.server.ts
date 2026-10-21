// The shop's details and its Pix key, editable after the setup wizard.
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { paymentProvider } from '#lib/server/payments/provider.ts';
import { getStoreProfile, savePixSettings, saveStoreInfo } from '#lib/server/settings/profile.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	return {
		profile: await getStoreProfile(undefined, { fresh: true }),
		onlineProvider: paymentProvider()?.name ?? null
	};
};

export const actions: Actions = {
	store: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		return attempt(async () => {
			await saveStoreInfo(
				{
					displayName: formString(d, 'displayName'),
					phone: formString(d, 'phone'),
					addressLine: formString(d, 'addressLine'),
					city: formString(d, 'city')
				},
				staffActor(staff)
			);
			return { ok: 'store' as const };
		});
	},
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
