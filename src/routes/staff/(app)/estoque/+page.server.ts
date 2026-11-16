// Estoque → Itens: the stock items, what is on hand and the average cost.
import { attempt, formString } from '#lib/server/actions.ts';
import { requireStaff, ADMIN, staffActor } from '#lib/server/auth/staff.ts';
import { db } from '#lib/server/db.ts';
import { listStockItems, saveStockItem, type BaseUnit } from '#lib/server/stock/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const ingredients = await db()<{ id: string; name: string }[]>`
		select id, name from menu_ingredients order by position, name`;
	return { items: await listStockItems(db(), { all: true }), ingredients };
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		return attempt(async () => {
			await saveStockItem(
				{
					id: formString(d, 'id') || null,
					name: formString(d, 'name'),
					baseUnit: formString(d, 'baseUnit') as BaseUnit,
					min: Number(formString(d, 'min') || '0'),
					blocksSale: d.get('blocksSale') === 'on',
					ingredientId: formString(d, 'ingredientId') || null,
					active: formString(d, 'id') ? d.get('active') === 'on' : true
				},
				staffActor(staff)
			);
			return { saved: true };
		});
	}
};
