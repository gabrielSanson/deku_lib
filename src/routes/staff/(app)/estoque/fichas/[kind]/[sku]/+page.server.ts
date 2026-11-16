// The ficha técnica of one product (/produto/<sku>) or add-on (/opcao/<sku>).
import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { attempt } from '#lib/server/actions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { listStockItems, recipeFor, saveRecipe } from '#lib/server/stock/service.ts';
import type { Actions, PageServerLoad } from './$types';

const KIND = { produto: 'product', opcao: 'option' } as const;

export const load: PageServerLoad = async ({ params }) => {
	const kind = KIND[params.kind as keyof typeof KIND];
	if (!kind) error(404, 'Não encontrado.');
	const recipe = await recipeFor(kind, params.sku);
	if (!recipe) error(404, 'Não encontrado.');
	return { recipe, items: await listStockItems() };
};

const lines = z
	.array(
		z.object({
			stockItemId: z.string().uuid(),
			qtyBase: z.number().int().positive(),
			ingredientId: z.string().max(60).nullable().optional()
		})
	)
	.max(40);

export const actions: Actions = {
	default: async (event) => {
		const staff = requirePermission(event, 'menu.edit');
		const kind = KIND[event.params.kind as keyof typeof KIND];
		if (!kind) error(404, 'Não encontrado.');
		let parsed;
		try {
			parsed = lines.safeParse(
				JSON.parse(String((await event.request.formData()).get('payload') ?? '[]'))
			);
		} catch {
			return fail(400, {});
		}
		if (!parsed.success) return fail(400, {});
		const data = parsed.data;
		return attempt(async () => {
			await saveRecipe(
				kind === 'product' ? { productSku: event.params.sku } : { optionSku: event.params.sku },
				data,
				staffActor(staff)
			);
			return { saved: true };
		});
	}
};
