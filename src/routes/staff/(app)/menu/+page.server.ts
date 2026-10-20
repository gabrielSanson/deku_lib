import { attempt, formString } from '#lib/server/actions.ts';
import { FRONT_OF_HOUSE, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { listIngredients, setIngredientAvailable } from '#lib/server/catalog/editor.ts';
import { getCatalog } from '#lib/server/catalog/service.ts';
import { db } from '#lib/server/db.ts';
import { setSoldOut } from '#lib/server/settings/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, FRONT_OF_HOUSE);
	const catalog = await getCatalog();
	const overrides = await db()<{ sku: string; reason: string | null; updated_at: Date }[]>`
		select sku, reason, updated_at from product_availability_overrides where sold_out and channel = 'all'`;
	return { catalog, overrides, ingredients: await listIngredients() };
};

export const actions: Actions = {
	ingredient: async (event) => {
		const staff = requireStaff(event, FRONT_OF_HOUSE);
		const d = await event.request.formData();
		return attempt(async () => {
			await setIngredientAvailable(
				formString(d, 'id'),
				formString(d, 'available') === '1',
				staffActor(staff)
			);
			return { ok: true };
		});
	},
	toggle: async (event) => {
		const staff = requireStaff(event, FRONT_OF_HOUSE);
		const d = await event.request.formData();
		return attempt(async () => {
			await setSoldOut(
				formString(d, 'sku'),
				formString(d, 'soldOut') === '1',
				staffActor(staff),
				formString(d, 'reason') || undefined
			);
			return { ok: true };
		});
	}
};
