import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { cartLineInput } from '#lib/domain/pricing.ts';
import { attempt, formString } from '#lib/server/actions.ts';
import { FRONT_OF_HOUSE, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { getCatalog, soldOutSkus } from '#lib/server/catalog/service.ts';
import { db } from '#lib/server/db.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, FRONT_OF_HOUSE);
	const [catalog, soldOut] = await Promise.all([getCatalog(), soldOutSkus(db(), 'counter')]);
	return {
		catalog: {
			...catalog,
			products: catalog.products.filter((p) => p.channels.includes('counter'))
		},
		soldOut: [...soldOut]
	};
};

const orderForm = z.object({
	lines: z.array(cartLineInput).min(1),
	fulfillmentType: z.enum(['counter', 'pickup']),
	customerLabel: z.string().trim().max(60).optional(),
	notes: z.string().trim().max(300).optional(),
	discountCents: z.number().int().min(0).default(0),
	idempotencyKey: z.string().uuid()
});

export const actions: Actions = {
	default: async (event) => {
		const staff = requireStaff(event, FRONT_OF_HOUSE);
		const data = await event.request.formData();
		let parsed: z.infer<typeof orderForm>;
		try {
			parsed = orderForm.parse(JSON.parse(formString(data, 'payload')));
		} catch {
			return fail(400, { error: 'Pedido inválido. Revise o carrinho.' });
		}
		if (parsed.discountCents > 0 && staff.role === 'cashier') {
			return fail(403, { error: 'Desconto exige gerente.' });
		}
		const result = await attempt(() =>
			createOrder({
				channel: 'counter',
				sourceMode: 'staff_pos',
				lines: parsed.lines,
				fulfillmentType: parsed.fulfillmentType,
				customerLabel: parsed.customerLabel || null,
				notes: parsed.notes || null,
				discountCents: parsed.discountCents,
				idempotencyKey: parsed.idempotencyKey,
				initialStatus: 'confirmed',
				actor: staffActor(staff)
			})
		);
		if ('id' in result) redirect(303, `/staff/pos/${result.id}/payment`);
		return result;
	}
};
