import { attempt, formString } from '#lib/server/actions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { deleteIngredient, listIngredients, saveIngredient } from '#lib/server/catalog/editor.ts';
import { uploadMenuImage } from '#lib/server/catalog/images.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'menu.edit');
	return { ingredients: await listIngredients() };
};

const allergens = (d: FormData) =>
	formString(d, 'allergens')
		.split(',')
		.map((a) => a.trim().toLowerCase())
		.filter(Boolean);

export const actions: Actions = {
	save: async (event) => {
		const staff = requirePermission(event, 'menu.edit');
		const d = await event.request.formData();
		return attempt(async () => {
			const photo = d.get('photo');
			const id = await saveIngredient(
				{
					id: formString(d, 'id') || undefined,
					name: formString(d, 'name'),
					allergens: allergens(d),
					position: Number(formString(d, 'position') || 0),
					imagePath:
						photo instanceof File && photo.size > 0
							? await uploadMenuImage(photo)
							: formString(d, 'removePhoto') === '1'
								? null
								: undefined
				},
				staffActor(staff)
			);
			return { ok: true, saved: id };
		});
	},
	delete: async (event) => {
		const staff = requirePermission(event, 'menu.edit');
		const d = await event.request.formData();
		return attempt(async () => {
			await deleteIngredient(formString(d, 'id'), staffActor(staff));
			return { ok: true };
		});
	}
};
