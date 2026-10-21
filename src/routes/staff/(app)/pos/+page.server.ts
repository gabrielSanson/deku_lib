import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { cartLineInput, priceCart } from '#lib/domain/pricing.ts';
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { unavailableReason } from '#lib/domain/catalog.ts';
import { evalCart, findOffer, offerMessage } from '#lib/server/campaigns/service.ts';
import {
	getCatalog,
	getCatalogForPricing,
	missingIngredients,
	soldOutSkus
} from '#lib/server/catalog/service.ts';
import { db } from '#lib/server/db.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { getTexts } from '#lib/server/settings/texts.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const [catalog, soldOut, missing] = await Promise.all([
		getCatalog(),
		soldOutSkus(db(), 'counter'),
		missingIngredients(db())
	]);
	for (const p of catalog.products) if (unavailableReason(p, soldOut, missing)) soldOut.add(p.sku);
	return {
		catalog: {
			...catalog,
			products: catalog.products.filter((p) => p.channels.includes('counter'))
		},
		soldOut: [...soldOut],
		missingIngredients: [...missing]
	};
};

const orderForm = z.object({
	lines: z.array(cartLineInput).min(1),
	fulfillmentType: z.enum(['counter', 'pickup', 'ifood']),
	ifoodCode: z.string().trim().max(20).optional(),
	customerLabel: z.string().trim().max(60).optional(),
	notes: z.string().trim().max(300).optional(),
	discountCents: z.number().int().min(0).default(0),
	couponCode: z.string().trim().max(30).optional(),
	idempotencyKey: z.string().uuid()
});

const quoteForm = z.object({
	lines: z.array(cartLineInput).min(1),
	couponCode: z.string().trim().max(30).optional()
});

export const actions: Actions = {
	/** Which promotion the cart gets, so staff charge the right amount. Counter sales are anonymous. */
	quote: async (event) => {
		requireStaff(event, ADMIN);
		const data = await event.request.formData();
		let raw: unknown = null;
		try {
			raw = JSON.parse(formString(data, 'payload'));
		} catch {
			/* falls through to the validation error */
		}
		const parsed = quoteForm.safeParse(raw);
		if (!parsed.success) return fail(400, { error: 'Pedido inválido.' });
		return attempt(async () => {
			const sql = db();
			const catalog = await getCatalogForPricing();
			const cart = priceCart(catalog, parsed.data.lines, {
				channel: 'counter',
				soldOut: await soldOutSkus(sql, 'counter'),
				missingIngredients: await missingIngredients(sql)
			});
			const offer = await findOffer(sql, {
				cart: evalCart(catalog, cart, 0),
				customerId: null,
				couponCode: parsed.data.couponCode
			});
			const texts = await getTexts();
			return {
				offer: {
					name: offer.applied?.name ?? null,
					discountCents: Math.min(offer.applied?.discountCents ?? 0, cart.subtotalCents),
					couponError: offer.couponProblem
						? offerMessage(texts, offer.couponProblem, offer.couponMinOrderCents)
						: null,
					couponBlocks: !!offer.couponProblem && offer.couponProblem !== 'better_offer'
				}
			};
		});
	},

	create: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const data = await event.request.formData();
		let parsed: z.infer<typeof orderForm>;
		try {
			parsed = orderForm.parse(JSON.parse(formString(data, 'payload')));
		} catch {
			return fail(400, { error: 'Pedido inválido. Revise o carrinho.' });
		}
		// Fallback while the iFood API is not live: staff re-key the iFood order here.
		// iFood has already collected the payment, so the order is recorded as paid by the channel.
		const ifood = parsed.fulfillmentType === 'ifood';
		if (ifood && !parsed.ifoodCode)
			return fail(400, { error: 'Informe o código do pedido no iFood.' });
		const result = await attempt(() =>
			createOrder({
				channel: ifood ? 'ifood' : 'counter',
				sourceMode: ifood ? 'ifood_manual' : 'staff_pos',
				lines: parsed.lines,
				fulfillmentType: parsed.fulfillmentType === 'ifood' ? 'delivery' : parsed.fulfillmentType,
				fulfillmentProvider: ifood ? 'ifood_courier' : 'shop',
				channelDisplayId: ifood ? parsed.ifoodCode : null,
				paymentStatus: ifood ? 'paid' : undefined,
				paymentPlan: ifood ? 'channel' : undefined,
				customerLabel: parsed.customerLabel || null,
				notes: parsed.notes || null,
				discountCents: parsed.discountCents,
				couponCode: ifood ? null : parsed.couponCode || null,
				idempotencyKey: parsed.idempotencyKey,
				// iFood orders are already paid; counter sales wait for payment on the next screen.
				initialStatus: ifood ? 'confirmed' : 'new',
				actor: staffActor(staff)
			})
		);
		if ('id' in result)
			redirect(303, ifood ? `/staff/orders/${result.id}` : `/staff/pos/${result.id}/payment`);
		return result;
	}
};
