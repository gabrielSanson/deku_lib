import { fail } from '@sveltejs/kit';
import { fixtureCatalog } from '#lib/server/catalog/fixture.ts';
import { attempt, formString } from '#lib/server/actions.ts';
import { MANAGERS, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import {
	deleteCategory,
	importCatalog,
	menuIsEmpty,
	saveCategory
} from '#lib/server/catalog/editor.ts';
import { loadCatalog } from '#lib/server/catalog/service.ts';
import { db } from '#lib/server/db.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, MANAGERS);
	const sql = db();
	const [catalog, categories, products, groups] = await Promise.all([
		loadCatalog(sql, { includeInactive: true }),
		sql<{ id: string; name: string; position: number; active: boolean; products: number }[]>`
			select c.id, c.name, c.position, c.active,
				(select count(*)::int from menu_products p where p.category_id = c.id) as products
			from menu_categories c order by c.position, c.name`,
		sql<{ sku: string; active: boolean }[]>`select sku, active from menu_products`,
		sql<
			{
				id: string;
				name: string;
				min_selections: number;
				max_selections: number;
				options: number;
				products: number;
			}[]
		>`
			select g.id, g.name, g.min_selections, g.max_selections,
				(select count(*)::int from menu_modifier_options o where o.group_id = g.id) as options,
				(select count(*)::int from menu_product_groups l where l.group_id = g.id) as products
			from menu_modifier_groups g order by g.name`
	]);
	return {
		catalog,
		categories,
		groups,
		hidden: products.filter((p) => !p.active).map((p) => p.sku),
		empty: await menuIsEmpty(sql)
	};
};

export const actions: Actions = {
	category: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		const d = await event.request.formData();
		return attempt(async () => {
			await saveCategory(
				{
					id: formString(d, 'id') || undefined,
					name: formString(d, 'name'),
					position: Number(formString(d, 'position') || 0),
					active: formString(d, 'active') !== '0'
				},
				staffActor(staff)
			);
			return { ok: 'Categoria salva.' };
		});
	},
	deleteCategory: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		const id = formString(await event.request.formData(), 'id');
		if (!id) return fail(400, { error: 'Categoria inválida.' });
		return attempt(async () => {
			await deleteCategory(id, staffActor(staff));
			return { ok: 'Categoria apagada.' };
		});
	},
	sample: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		return attempt(async () => {
			if (!(await menuIsEmpty())) return fail(400, { error: 'O cardápio já tem produtos.' });
			await importCatalog(fixtureCatalog, staffActor(staff));
			return { ok: 'Cardápio de exemplo carregado. Ajuste nomes, preços e fotos.' };
		});
	}
};
