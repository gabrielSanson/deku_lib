import { attempt, failText, formString, shopText } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import {
	deleteCategory,
	importCatalog,
	menuIsEmpty,
	saveCategory
} from '#lib/server/catalog/editor.ts';
import { loadCatalog } from '#lib/server/catalog/service.ts';
import { db } from '#lib/server/db.ts';
import type { Actions, PageServerLoad } from './$types';
import { menuImageUrl, uploadMenuImage } from '#lib/server/catalog/images.ts';
import { preset } from '#lib/server/presets/index.ts';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const sql = db();
	const [catalog, categories, products, groups] = await Promise.all([
		loadCatalog(sql, { includeInactive: true }),
		sql<
			{
				id: string;
				name: string;
				position: number;
				active: boolean;
				products: number;
				image_path: string | null;
			}[]
		>`
			select c.id, c.name, c.position, c.active, c.image_path,
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
		categories: categories.map(({ image_path, ...c }) => ({
			...c,
			imageUrl: menuImageUrl(image_path)
		})),
		groups,
		hidden: products.filter((p) => !p.active).map((p) => p.sku),
		empty: await menuIsEmpty(sql)
	};
};

export const actions: Actions = {
	category: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		return attempt(async () => {
			const photo = d.get('photo');
			const imagePath =
				photo instanceof File && photo.size > 0
					? await uploadMenuImage(photo)
					: formString(d, 'removePhoto') === '1'
						? null
						: undefined;
			await saveCategory(
				{
					id: formString(d, 'id') || undefined,
					name: formString(d, 'name'),
					position: Number(formString(d, 'position') || 0),
					active: formString(d, 'active') !== '0',
					imagePath
				},
				staffActor(staff)
			);
			return { ok: await shopText('ok.categorySaved') };
		});
	},
	deleteCategory: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const id = formString(await event.request.formData(), 'id');
		if (!id) return failText(400, 'err.menu.badCategory');
		return attempt(async () => {
			await deleteCategory(id, staffActor(staff));
			return { ok: await shopText('ok.categoryDeleted') };
		});
	},
	sample: async (event) => {
		const staff = requireStaff(event, ADMIN);
		return attempt(async () => {
			if (!(await menuIsEmpty())) return failText(400, 'err.menu.notEmpty');
			await importCatalog(preset().catalog, staffActor(staff));
			return { ok: await shopText('ok.sampleMenu') };
		});
	}
};
