import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { slots } from '#lib/domain/hours.ts';
import { formatBRL } from '#lib/domain/money.ts';
import { SHOP_TZ } from '#lib/domain/time.ts';
import { WEB_PAYMENT_METHODS, webPaymentPlan } from '#lib/domain/payment-rules.ts';
import { normalizeBrPhone } from '#lib/domain/phone.ts';
import { cartLineInput, priceCart } from '#lib/domain/pricing.ts';
import { deliveryRuleFor } from '#lib/server/delivery/geo.ts';
import { attempt } from '#lib/server/actions.ts';
import {
	customerIdByPhone,
	evalCart,
	findOffer,
	offerMessage
} from '#lib/server/campaigns/service.ts';
import {
	getCatalogForPricing,
	missingIngredients,
	soldOutSkus
} from '#lib/server/catalog/service.ts';
import { db } from '#lib/server/db.ts';
import { isKiosk } from '#lib/server/kiosk.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { whatsappEnabled } from '#lib/server/whatsapp/settings.ts';
import { attachWhatsappLink, whatsappLinkPhone } from '#lib/server/whatsapp/service.ts';
import { startOnlinePayment } from '#lib/server/payments/online.ts';
import { paymentProvider } from '#lib/server/payments/provider.ts';
import { clientKey, rateLimit } from '#lib/server/rate-limit.ts';
import { getStoreProfile } from '#lib/server/settings/profile.ts';
import { getSchedule } from '#lib/server/settings/hours.ts';
import { getStoreSettings } from '#lib/server/settings/service.ts';
import { getTexts } from '#lib/server/settings/texts.ts';
import { fill } from '#lib/texts/catalog.ts';
import type { Actions, PageServerLoad } from './$types';

const slotLabel = new Intl.DateTimeFormat('pt-BR', {
	timeZone: SHOP_TZ,
	weekday: 'short',
	day: '2-digit',
	month: '2-digit',
	hour: '2-digit',
	minute: '2-digit'
});

/** The 15-minute slots a customer may schedule for (empty when scheduling is off). */
async function scheduleSlots(kiosk: boolean) {
	const settings = await getStoreSettings();
	if (!settings.schedulingEnabled || kiosk) return [];
	return slots(await getSchedule(), new Date(), settings.prepTimeMinutes).map((d) => ({
		value: d.toISOString(),
		label: slotLabel.format(d)
	}));
}

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const provider = await paymentProvider();
	// Signed-in customers get their details filled in; they can still change them. Coming from
	// the WhatsApp bot's link, the number they wrote from is filled in.
	const c = locals.customer;
	const waPhone = c?.phone ? null : await whatsappLinkPhone(cookies.get('wa_link'));
	return {
		onlineMethods: provider?.methods ?? [],
		whatsapp: await whatsappEnabled(),
		refCode: cookies.get('ref_code') ?? '',
		slots: await scheduleSlots(isKiosk(cookies)),
		prefill: {
			name: c?.name ?? '',
			phone: c?.phone ?? (waPhone ? waPhone.replace(/^\+55/, '') : ''),
			email: c?.email ?? ''
		}
	};
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
	fulfillmentType: z.enum(['dine_in', 'pickup', 'delivery']),
	tableLabel: z.string().trim().max(20).optional(),
	address: address.optional(),
	name: z.string().trim().min(2).max(60),
	/** Optional when eating in: only the name is needed to call the order. */
	phone: z.string().trim().max(25).default(''),
	email: z.union([z.literal(''), z.string().trim().email().max(120)]).optional(),
	marketingConsent: z.boolean().default(false),
	whatsappUpdates: z.boolean().default(false),
	payment: z.enum([...WEB_PAYMENT_METHODS, 'counter']),
	couponCode: z.string().trim().max(30).optional(),
	/** An order for later: one of the offered slots, as an ISO time. */
	scheduledFor: z.string().datetime().optional(),
	idempotencyKey: z.string().uuid()
});

// The quote runs while the customer is still typing: name and payment may be empty.
const quoteInput = checkout
	.pick({ lines: true, fulfillmentType: true, address: true, couponCode: true })
	.extend({ phone: z.string().max(25).optional() });

function parse<T extends z.ZodType>(schema: T, raw: string) {
	try {
		return schema.safeParse(JSON.parse(raw)) as z.ZodSafeParseResult<z.infer<T>>;
	} catch {
		return null;
	}
}

export const actions: Actions = {
	/** Server-side price and fee preview; never trusted at placement time. */
	quote: async ({ request, locals, cookies }) => {
		const data = await request.formData();
		const parsed = parse(quoteInput, String(data.get('payload') ?? ''));
		const texts = await getTexts();
		if (!parsed?.success) return fail(400, { quoteError: texts['checkout.error.review'] });
		const input = parsed.data;
		return attempt(async () => {
			const sql = db();
			const catalog = await getCatalogForPricing();
			const cart = priceCart(catalog, input.lines, {
				channel: 'web',
				soldOut: await soldOutSkus(sql, 'web'),
				missingIngredients: await missingIngredients(sql)
			});
			let deliveryFeeCents = 0;
			let deliveryError: string | null = null;
			if (input.fulfillmentType === 'delivery') {
				const rule = input.address ? (await deliveryRuleFor(input.address, sql)).rule : null;
				if (!rule) deliveryError = texts['checkout.error.noDelivery'];
				else if (cart.subtotalCents < rule.minOrderCents)
					deliveryError = fill(texts['checkout.error.minOrder'], {
						amount: formatBRL(rule.minOrderCents)
					});
				else deliveryFeeCents = rule.feeCents;
			}
			const offer = await findOffer(sql, {
				cart: evalCart(catalog, cart, deliveryFeeCents),
				// Signed in, the account's history counts (first-order offers, per-customer limits).
				customerId:
					(isKiosk(cookies) ? null : locals.customer?.id) ??
					(await customerIdByPhone(sql, normalizeBrPhone(input.phone ?? ''))),
				couponCode: input.couponCode
			});
			const discountCents = Math.min(offer.applied?.discountCents ?? 0, cart.subtotalCents);
			return {
				quote: {
					subtotalCents: cart.subtotalCents,
					deliveryFeeCents,
					discountCents,
					offerName: offer.applied?.name ?? null,
					couponApplied: !!offer.applied?.couponId,
					couponError: offer.couponProblem
						? offerMessage(texts, offer.couponProblem, offer.couponMinOrderCents)
						: null,
					// Placing the order would be refused with this code; a better automatic offer is fine.
					couponBlocks: !!offer.couponProblem && offer.couponProblem !== 'better_offer',
					totalCents: cart.subtotalCents - discountCents + deliveryFeeCents,
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

	place: async (event) => {
		const { request, url, cookies, locals } = event;
		const texts = await getTexts();
		if (!rateLimit(`checkout:${clientKey(event)}`, 10, 10 * 60_000)) {
			return fail(429, { error: texts['checkout.error.tooMany'] });
		}
		const data = await request.formData();
		const parsed = parse(checkout, String(data.get('payload') ?? ''));
		if (!parsed?.success) return fail(400, { error: texts['checkout.error.review'] });
		const input = parsed.data;
		const kiosk = isKiosk(cookies);
		const phone = input.phone ? normalizeBrPhone(input.phone) : null;
		// At the totem the order is called by its number, so the phone is optional.
		if (!phone && (input.phone || (input.fulfillmentType !== 'dine_in' && !kiosk)))
			return fail(400, { error: texts['checkout.error.phone'] });
		if (kiosk && input.fulfillmentType === 'delivery')
			return fail(400, { error: texts['checkout.error.review'] });
		if (input.payment === 'counter' && !kiosk)
			return fail(400, { error: texts['checkout.error.review'] });
		if (input.scheduledFor && (kiosk || input.fulfillmentType === 'dine_in'))
			return fail(400, { error: texts['checkout.error.review'] });
		if (input.fulfillmentType === 'delivery' && !input.address)
			return fail(400, { error: texts['checkout.error.address'] });

		if (input.payment === 'pix_key' && !(await getStoreProfile()).pix.enabled) {
			return fail(400, { error: texts['checkout.error.pix'] });
		}
		const provider = await paymentProvider();
		if (
			(input.payment === 'pix' || input.payment === 'online_card') &&
			!provider?.methods.includes(input.payment)
		) {
			return fail(400, { error: texts['checkout.error.online'] });
		}

		const rule =
			input.fulfillmentType === 'delivery' && input.address
				? (await deliveryRuleFor(input.address)).rule
				: null;

		const result = await attempt(() =>
			createOrder({
				channel: 'web',
				sourceMode: kiosk ? 'kiosk' : 'web',
				lines: input.lines,
				fulfillmentType: input.fulfillmentType,
				tableLabel: input.tableLabel || null,
				fulfillmentProvider: input.fulfillmentType === 'delivery' ? 'own_driver' : 'shop',
				customerLabel: input.name,
				// Signed in, the order belongs to the account (not at the shared totem).
				customerId: kiosk ? null : (locals.customer?.id ?? null),
				// Without a phone or e-mail there is nobody to link the order to.
				customer:
					phone || input.email
						? {
								name: input.name,
								phoneE164: phone,
								email: input.email || null,
								marketingConsent: input.marketingConsent,
								whatsappUpdates: input.whatsappUpdates && !!phone
							}
						: undefined,
				address: input.address
					? { ...input.address, recipient: input.name, cep: input.address.cep.replace(/\D/g, '') }
					: undefined,
				deliveryRule: rule,
				couponCode: input.couponCode || null,
				idempotencyKey: input.idempotencyKey,
				paymentPlan: webPaymentPlan(input.payment),
				scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
				actor: { type: 'customer', id: null }
			})
		);
		if (!('id' in result)) return result;
		await attachWhatsappLink(cookies.get('wa_link'), result.id);

		// Nothing to pay (a full discount): the order is already confirmed.
		if (result.status !== 'new') redirect(303, `/orders/${result.publicToken}?novo=1`);
		const method = input.payment;
		if (method === 'pix_key') redirect(303, `/checkout/payment/${result.publicToken}`);
		if (method === 'counter') redirect(303, `/orders/${result.publicToken}?novo=1`);

		const payment = await attempt(() =>
			startOnlinePayment({
				orderId: result.id,
				method,
				idempotencyKey: `pay:${input.idempotencyKey}`,
				returnUrl: new URL(`/checkout/payment/${result.publicToken}`, url).toString()
			})
		);
		if (!('tenderId' in payment)) return payment;
		if (payment.redirectUrl) redirect(303, payment.redirectUrl, { external: true });
		redirect(303, `/checkout/payment/${result.publicToken}`);
	}
};
