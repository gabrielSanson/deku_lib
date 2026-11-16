// Estoque → Contagem: type what is on the shelf; only the items that changed are adjusted.
import { attempt } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { listStockItems, recordCount } from '#lib/server/stock/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ items: await listStockItems() });

export const actions: Actions = {
	default: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const counts = [...d.entries()]
			.filter(([k, v]) => k.startsWith('c:') && String(v).trim() !== '')
			.map(([k, v]) => ({ stockItemId: k.slice(2), counted: Number(v) }));
		return attempt(async () => ({ adjusted: await recordCount(counts, staffActor(staff)) }));
	}
};
