// Estoque → Perdas: food thrown away, at its average cost.
import { attempt, formString } from '#lib/server/actions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { listStockItems, recentMovements, recordWaste } from '#lib/server/stock/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	items: await listStockItems(),
	waste: await recentMovements(['waste'])
});

export const actions: Actions = {
	default: async (event) => {
		const staff = requirePermission(event, 'menu.edit');
		const d = await event.request.formData();
		return attempt(async () => {
			await recordWaste(
				formString(d, 'stockItemId'),
				Number(formString(d, 'qty')),
				formString(d, 'reason'),
				staffActor(staff)
			);
			return { saved: true };
		});
	}
};
