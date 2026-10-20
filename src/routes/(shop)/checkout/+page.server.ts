import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { normalizeBrPhone } from '#lib/domain/phone.ts';
import { cartLineInput, matchDeliveryRule, priceCart } from '#lib/domain/pricing.ts';
import { attempt } from '#lib/server/actions.ts';
import { getCatalogForPricing, soldOutSkus } from '#lib/server/catalog/service.ts';
import { db } from '#lib/server/db.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { startOnlinePayment } from '#lib/server/payments/online.ts';
import { paymentProvider } from '#lib/server/payments/provider.ts';
import { rateLimit } from '#lib/server/rate-limit.ts';
import { getStoreProfile } from '#lib/server/settings/profile.ts';
import { getStoreSettings, listDeliveryRules } from '#lib/server/settings/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const provider = paymentProvider();
	return { onlineMethods: provider?.methods ?? [] };
};

const address = z.object({
	cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
	street: z.string().trim().min(2).max(120),
	number: z.string().trim().min(1).max(12),
	complement: z.string().trim().max(60).optional(),
	neighborhood: z.string().trim().min(2).max(60),
	city: z.string().trim().min(2).max(60),
	state: z.string().trim().length(2),
	instructions: z.string().trim().max(200).optional()
});

const checkout = z.object({
	lines: z.array(cartLineInput).min(1).max(60),
	fulfillmentType: z.enum(['pickup', 'delivery']),
	address: address.optional(),
	name: z.string().trim().min(2).max(60),
	phone: z.string().trim().min(8).max(25),
	email: z.union([z.literal(''), z.string().trim().email().max(120)]).optional(),
	marketingConsent: z.boolean().default(false),
	payment: z.enum(['pix', 'online_card', 'pix_key', 'on_fulfillment']),
	idempotencyKey: z.string().uuid()
});

function parse(raw: string) {
	try {
		return checkout.safeParse(JSON.parse(raw));
	} catch {
		return null;
	}
}

export const actions: Actions = {
	/** Server-side price and fee preview; never trusted at placement time. */
	quote: async ({ request }) => {
		const data = await request.formData();
		const parsed = parse(String(data.get('payload') ?? ''));
		if (!parsed?.success) return fail(400, { quoteError: 'Revise os dados do pedido.' });
		const input = parsed.data;
		return attempt(async () => {
			const sql = db();
			const cart = priceCart(await getCatalogForPricing(), input.lines, {
				channel: 'web',
				soldOut: await soldOutSkus(sql, 'web')
			});
			let deliveryFeeCents = 0;
			let deliveryError: string | null = null;
			if (input.fulfillmentType === 'delivery') {
				const rule = input.address
					? matchDeliveryRule(await listDeliveryRules(sql), input.address)
					: null;
				if (!rule) deliveryError = 'Ainda não entregamos neste endereço.';
				else if (cart.subtotalCents < rule.minOrderCents)
					deliveryError = `Pedido mínimo para este endereço: R$ ${(rule.minOrderCents / 100).toFixed(2).replace('.', ',')}.`;
				else deliveryFeeCents = rule.feeCents;
			}
			return {
				quote: {
					subtotalCents: cart.subtotalCents,
					deliveryFeeCents,
					totalCents: cart.subtotalCents + deliveryFeeCents,
					deliveryError,
					lines: cart.lines.map((l) => ({
						sku: l.productSku,
						name: l.productName,
						quantity: l.quantity,
						lineTotalCents: l.lineTotalCents
					}))
				}
			};
		});
	},

	place: async ({ request, getClientAddress, url }) => {
		if (!rateLimit(`checkout:${getClientAddress()}`, 10, 10 * 60_000)) {
			return fail(429, { error: 'Muitas tentativas. Aguarde alguns minutos.' });
		}
		const data = await request.formData();
		const parsed = parse(String(data.get('payload') ?? ''));
		if (!parsed?.success) {
			return fail(400, { error: parsed?.error.issues[0]?.message ?? 'Revise os dados do pedido.' });
		}
		const input = parsed.data;
		const phone = normalizeBrPhone(input.phone);
		if (!phone) return fail(400, { error: 'Telefone inválido. Use DDD + número.' });
		if (input.fulfillmentType === 'delivery' && !input.address)
			return fail(400, { error: 'Informe o endereço de entrega.' });

		const settings = await getStoreSettings();
		if (input.payment === 'on_fulfillment' && !settings.payOnFulfillmentEnabled) {
			return fail(400, { error: 'Pagamento na entrega/retirada não está disponível.' });
		}
		if (input.payment === 'pix_key' && !(await getStoreProfile()).pix.enabled) {
			return fail(400, { error: 'Pix indisponível no momento.' });
		}
		const provider = paymentProvider();
		if (
			(input.payment === 'pix' || input.payment === 'online_card') &&
			!provider?.methods.includes(input.payment)
		) {
			return fail(400, { error: 'Pagamento online indisponível no momento.' });
		}

		const rule =
			input.fulfillmentType === 'delivery' && input.address
				? matchDeliveryRule(await listDeliveryRules(), input.address)
				: null;

		const result = await attempt(() =>
			createOrder({
				channel: 'web',
				sourceMode: 'web',
				lines: input.lines,
				fulfillmentType: input.fulfillmentType,
				fulfillmentProvider: input.fulfillmentType === 'delivery' ? 'own_driver' : 'shop',
				customer: {
					name: input.name,
					phoneE164: phone,
					email: input.email || null,
					marketingConsent: input.marketingConsent
				},
				address: input.address
					? { ...input.address, recipient: input.name, cep: input.address.cep.replace(/\D/g, '') }
					: undefined,
				deliveryRule: rule,
				idempotencyKey: input.idempotencyKey,
				paymentPlan:
					input.payment === 'on_fulfillment' || input.payment === 'pix_key'
						? input.payment
						: 'online',
				actor: { type: 'customer', id: null }
			})
		);
		if (!('id' in result)) return result;

		if (input.payment === 'on_fulfillment') redirect(303, `/orders/${result.publicToken}?novo=1`);
		if (input.payment === 'pix_key') redirect(303, `/checkout/payment/${result.publicToken}`);

		const payment = await attempt(() =>
			startOnlinePayment({
				orderId: result.id,
				method: input.payment as 'pix' | 'online_card',
				idempotencyKey: `pay:${input.idempotencyKey}`,
				returnUrl: new URL(`/checkout/payment/${result.publicToken}`, url).toString()
			})
		);
		if (!('tenderId' in payment)) return payment;
		if (payment.redirectUrl) redirect(303, payment.redirectUrl);
		redirect(303, `/checkout/payment/${result.publicToken}`);
	}
};
