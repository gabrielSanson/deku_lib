import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { deleteIngredient, listIngredients, saveIngredient } from '#lib/server/catalog/editor.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	return { ingredients: await listIngredients() };
};

const allergens = (d: FormData) =>
	formString(d, 'allergens')
		.split(',')
		.map((a) => a.trim().toLowerCase())
		.filter(Boolean);

export const actions: Actions = {
	save: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		return attempt(async () => {
			const id = await saveIngredient(
				{
					id: formString(d, 'id') || undefined,
					name: formString(d, 'name'),
					allergens: allergens(d),
					position: Number(formString(d, 'position') || 0)
				},
				staffActor(staff)
			);
			return { ok: true, saved: id };
		});
	},
	delete: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		return attempt(async () => {
			await deleteIngredient(formString(d, 'id'), staffActor(staff));
			return { ok: true };
		});
	}
};
