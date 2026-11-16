// Tipos de pedido: which channels take orders (site, dine-in, pickup, delivery),
// prep time and the open-order cap. Open/pause lives in Horários e pausa.
import { attempt, failText, formString } from '#lib/server/actions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { updateStoreSettings } from '#lib/server/settings/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'settings.edit');
	return {};
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requirePermission(event, 'settings.edit');
		const d = await event.request.formData();
		const prep = Number(formString(d, 'prepTimeMinutes'));
		const maxRaw = formString(d, 'maxOpenOrders');
		const max = maxRaw ? Number(maxRaw) : null;
		const perOrder = Number(formString(d, 'perOrderMinutes') || 2);
		const deliveryMinutes = Number(formString(d, 'deliveryMinutes') || 20);
		if (
			!Number.isInteger(prep) ||
			prep < 1 ||
			prep > 240 ||
			!Number.isInteger(perOrder) ||
			perOrder < 0 ||
			perOrder > 30 ||
			!Number.isInteger(deliveryMinutes) ||
			deliveryMinutes < 0 ||
			deliveryMinutes > 180
		)
			return failText(400, 'err.settings.prepTime');
		if (max !== null && (!Number.isInteger(max) || max < 1))
			return failText(400, 'err.settings.capacity');
		const slotRaw = formString(d, 'maxOrdersPerSlot');
		const perSlot = slotRaw ? Number(slotRaw) : null;
		if (perSlot !== null && (!Number.isInteger(perSlot) || perSlot < 1))
			return failText(400, 'err.settings.capacity');
		const unpaidPix = Number(formString(d, 'unpaidPixMinutes'));
		const unpaidCounter = Number(formString(d, 'unpaidCounterMinutes'));
		const minutesOk = (n: number) => Number.isInteger(n) && n >= 5 && n <= 120;
		if (!minutesOk(unpaidPix) || !minutesOk(unpaidCounter))
			return failText(400, 'err.settings.unpaidMinutes');
		return attempt(async () => {
			await updateStoreSettings(
				{
					dineInEnabled: d.get('dineInEnabled') === 'on',
					pickupEnabled: d.get('pickupEnabled') === 'on',
					deliveryEnabled: d.get('deliveryEnabled') === 'on',
					webOrderingEnabled: d.get('webOrderingEnabled') === 'on',
					prepTimeMinutes: prep,
					perOrderMinutes: perOrder,
					deliveryMinutes,
					maxOpenOrders: max,
					unpaidPixMinutes: unpaidPix,
					unpaidCounterMinutes: unpaidCounter,
					schedulingEnabled: d.get('schedulingEnabled') === 'on',
					maxOrdersPerSlot: perSlot
				},
				staffActor(staff),
				Number(formString(d, 'version'))
			);
			return { ok: true };
		});
	}
};
