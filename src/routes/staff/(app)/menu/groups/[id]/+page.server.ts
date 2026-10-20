import { error, fail, redirect } from '@sveltejs/kit';
import { parseBRL } from '#lib/domain/money.ts';
import { attempt, formString } from '#lib/server/actions.ts';
import { MANAGERS, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { deleteGroup, saveGroup } from '#lib/server/catalog/editor.ts';
import { db } from '#lib/server/db.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, MANAGERS);
	if (event.params.id === 'novo') {
		return {
			isNew: true,
			group: { id: '', name: '', minSelections: 0, maxSelections: 1 },
			options: [{ sku: '', name: '', priceCents: 0, maxQuantity: 1, active: true }],
			usedBy: []
		};
	}
	const sql = db();
	const [g] = await sql<
		{ id: string; name: string; min_selections: number; max_selections: number }[]
	>`
		select id, name, min_selections, max_selections from menu_modifier_groups where id = ${event.params.id}`;
	if (!g) error(404, 'Grupo não encontrado.');
	const [options, usedBy] = await Promise.all([
		sql<
			{ sku: string; name: string; price_cents: number; max_quantity: number; active: boolean }[]
		>`
			select sku, name, price_cents, max_quantity, active from menu_modifier_options
			where group_id = ${g.id} order by position, name`,
		sql<{ sku: string; name: string }[]>`
			select p.sku, p.name from menu_product_groups l join menu_products p on p.sku = l.product_sku
			where l.group_id = ${g.id} order by p.name`
	]);
	return {
		isNew: false,
		group: {
			id: g.id,
			name: g.name,
			minSelections: g.min_selections,
			maxSelections: g.max_selections
		},
		options: options.map((o) => ({
			sku: o.sku,
			name: o.name,
			priceCents: o.price_cents,
			maxQuantity: o.max_quantity,
			active: o.active
		})),
		usedBy
	};
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		const d = await event.request.formData();
		const names = d.getAll('optionName').map(String);
		const skus = d.getAll('optionSku').map(String);
		const prices = d.getAll('optionPrice').map(String);
		const maxes = d.getAll('optionMax').map(String);
		const active = new Set(d.getAll('optionActive').map(String));
		const options: {
			sku?: string;
			name: string;
			priceCents: number;
			maxQuantity: number;
			active: boolean;
		}[] = [];
		for (const [i, name] of names.entries()) {
			if (!name.trim()) continue;
			const price = prices[i]?.trim() ? parseBRL(prices[i]) : 0;
			if (price === null) return fail(400, { error: `Preço inválido em "${name}".` });
			options.push({
				sku: skus[i]?.trim().toUpperCase() || undefined,
				name: name.trim(),
				priceCents: price,
				maxQuantity: Number(maxes[i] || 1),
				active: active.has(String(i))
			});
		}
		const isNew = event.params.id === 'novo';
		const result = await attempt(async () => ({
			id: await saveGroup(
				{
					id: isNew ? undefined : event.params.id,
					name: formString(d, 'name'),
					minSelections: Number(formString(d, 'minSelections') || 0),
					maxSelections: Number(formString(d, 'maxSelections') || 1),
					options
				},
				staffActor(staff)
			)
		}));
		if (!('id' in result)) return result;
		redirect(303, `/staff/menu/groups/${result.id}?salvo=1`);
	},
	delete: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		await deleteGroup(event.params.id, staffActor(staff));
		redirect(303, '/staff/menu/edit');
	}
};
