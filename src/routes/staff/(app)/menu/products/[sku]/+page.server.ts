import { error, fail, redirect } from '@sveltejs/kit';
import { parseBRL } from '#lib/domain/money.ts';
import { attempt, formString } from '#lib/server/actions.ts';
import { MANAGERS, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { deleteProduct, PREP_STATIONS, saveProduct } from '#lib/server/catalog/editor.ts';
import { menuImageUrl, uploadMenuImage } from '#lib/server/catalog/images.ts';
import { db } from '#lib/server/db.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, MANAGERS);
	const sql = db();
	const isNew = event.params.sku === 'novo';
	const [categories, groups, rows, links] = await Promise.all([
		sql<
			{ id: string; name: string }[]
		>`select id, name from menu_categories order by position, name`,
		sql<{ id: string; name: string }[]>`select id, name from menu_modifier_groups order by name`,
		isNew
			? Promise.resolve([])
			: sql<
					{
						sku: string;
						slug: string;
						name: string;
						description: string;
						image_path: string | null;
						category_id: string;
						price_cents: number;
						prep_station: string;
						channels: string[];
						allergens: string[];
						position: number;
						active: boolean;
					}[]
				>`select * from menu_products where sku = ${event.params.sku}`,
		isNew
			? Promise.resolve([])
			: sql<{ group_id: string }[]>`
				select group_id from menu_product_groups where product_sku = ${event.params.sku} order by position`
	]);
	if (!categories.length) redirect(303, '/staff/menu/edit');
	const p = rows[0];
	if (!isNew && !p) error(404, 'Produto não encontrado.');
	return {
		isNew,
		categories,
		groups,
		stations: PREP_STATIONS,
		product: p
			? {
					sku: p.sku,
					name: p.name,
					description: p.description,
					categoryId: p.category_id,
					priceCents: p.price_cents,
					prepStation: p.prep_station,
					channels: p.channels,
					allergens: p.allergens,
					position: p.position,
					active: p.active,
					imageUrl: menuImageUrl(p.image_path),
					groupIds: links.map((l) => l.group_id)
				}
			: {
					sku: '',
					name: '',
					description: '',
					categoryId: event.url.searchParams.get('categoria') ?? categories[0].id,
					priceCents: 0,
					prepStation: 'grill',
					channels: ['counter', 'web', 'ifood'],
					allergens: [] as string[],
					position: 0,
					active: true,
					imageUrl: null,
					groupIds: [] as string[]
				}
	};
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		const d = await event.request.formData();
		const price = parseBRL(formString(d, 'price'));
		if (price === null) return fail(400, { error: 'Preço inválido. Use por exemplo 29,90.' });
		const isNew = event.params.sku === 'novo';
		const result = await attempt(async () => {
			const photo = d.get('photo');
			const imagePath =
				photo instanceof File && photo.size > 0
					? await uploadMenuImage(photo)
					: formString(d, 'removePhoto') === '1'
						? null
						: undefined;
			const sku = await saveProduct(
				{
					sku: isNew ? formString(d, 'sku').toUpperCase() || undefined : undefined,
					name: formString(d, 'name'),
					description: formString(d, 'description'),
					categoryId: formString(d, 'categoryId'),
					priceCents: price,
					prepStation: formString(d, 'prepStation') as 'grill',
					channels: d.getAll('channels').map(String) as 'web'[],
					allergens: formString(d, 'allergens')
						.split(',')
						.map((a) => a.trim().toLowerCase())
						.filter(Boolean),
					groupIds: d.getAll('groupIds').map(String),
					position: Number(formString(d, 'position') || 0),
					active: d.get('active') === 'on',
					imagePath
				},
				staffActor(staff),
				isNew ? undefined : event.params.sku
			);
			return { sku };
		});
		if (!('sku' in result)) return result;
		redirect(303, isNew ? `/staff/menu/products/${result.sku}?salvo=1` : `?salvo=1`);
	},
	delete: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		const result = await attempt(async () => {
			await deleteProduct(event.params.sku, staffActor(staff));
			return { ok: true };
		});
		if (!('ok' in result)) return result;
		redirect(303, '/staff/menu/edit');
	}
};
