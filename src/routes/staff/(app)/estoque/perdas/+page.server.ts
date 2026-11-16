// Estoque → Perdas: food thrown away, at its average cost.
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { listStockItems, recentMovements, recordWaste } from '#lib/server/stock/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	items: await listStockItems(),
	waste: await recentMovements(['waste'])
});

export const actions: Actions = {
	default: async (event) => {
		const staff = requireStaff(event, ADMIN);
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
