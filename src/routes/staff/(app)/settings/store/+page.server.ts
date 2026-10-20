import { fail } from '@sveltejs/kit';
import { attempt, formString } from '#lib/server/actions.ts';
import { MANAGERS, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { updateStoreSettings } from '#lib/server/settings/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, MANAGERS);
	return {};
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		const d = await event.request.formData();
		const prep = Number(formString(d, 'prepTimeMinutes'));
		const maxRaw = formString(d, 'maxOpenOrders');
		const max = maxRaw ? Number(maxRaw) : null;
		if (!Number.isInteger(prep) || prep < 1 || prep > 240)
			return fail(400, { error: 'Tempo de preparo inválido.' });
		if (max !== null && (!Number.isInteger(max) || max < 1))
			return fail(400, { error: 'Capacidade inválida.' });
		return attempt(async () => {
			await updateStoreSettings(
				{
					acceptingOrders: d.get('acceptingOrders') === 'on',
					pauseReason: formString(d, 'pauseReason') || null,
					pickupEnabled: d.get('pickupEnabled') === 'on',
					deliveryEnabled: d.get('deliveryEnabled') === 'on',
					webOrderingEnabled: d.get('webOrderingEnabled') === 'on',
					payOnFulfillmentEnabled: d.get('payOnFulfillmentEnabled') === 'on',
					prepTimeMinutes: prep,
					maxOpenOrders: max
				},
				staffActor(staff),
				Number(formString(d, 'version'))
			);
			return { ok: true };
		});
	},
	toggle: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		const d = await event.request.formData();
		const open = formString(d, 'open') === '1';
		return attempt(async () => {
			await updateStoreSettings(
				{
					acceptingOrders: open,
					pauseReason: open ? null : formString(d, 'pauseReason') || 'Pausado pela equipe'
				},
				staffActor(staff)
			);
			return { ok: true };
		});
	}
};
