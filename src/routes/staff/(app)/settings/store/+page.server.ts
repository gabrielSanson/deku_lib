// Tipos de pedido: which channels take orders (site, dine-in, pickup, delivery),
// prep time and the open-order cap. Open/pause lives in Horários e pausa.
import { attempt, failText, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { updateStoreSettings } from '#lib/server/settings/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	return {};
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const prep = Number(formString(d, 'prepTimeMinutes'));
		const maxRaw = formString(d, 'maxOpenOrders');
		const max = maxRaw ? Number(maxRaw) : null;
		if (!Number.isInteger(prep) || prep < 1 || prep > 240)
			return failText(400, 'err.settings.prepTime');
		if (max !== null && (!Number.isInteger(max) || max < 1))
			return failText(400, 'err.settings.capacity');
		return attempt(async () => {
			await updateStoreSettings(
				{
					dineInEnabled: d.get('dineInEnabled') === 'on',
					pickupEnabled: d.get('pickupEnabled') === 'on',
					deliveryEnabled: d.get('deliveryEnabled') === 'on',
					webOrderingEnabled: d.get('webOrderingEnabled') === 'on',
					prepTimeMinutes: prep,
					maxOpenOrders: max
				},
				staffActor(staff),
				Number(formString(d, 'version'))
			);
			return { ok: true };
		});
	}
};
