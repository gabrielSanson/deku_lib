// Open Delivery order payloads → our order model, and the event types we act on.
// Written from the published Open Delivery examples (spec version in OD_SPEC_VERSION);
// UNVERIFIED against 99Food or Keeta until each partner's homologation.
import type { OrderStatus } from '#lib/domain/order-status.ts';
import type { PricedLine } from '#lib/domain/pricing.ts';
import type { EventMeaning, ExternalOrder, ProductInfo } from '../channel';

/** TODO(verify): the Open Delivery version each partner implements. */
export const OD_SPEC_VERSION = '1.6.0';

export const OD_PARTNERS = ['99food', 'keeta'] as const;
export type OdPartner = (typeof OD_PARTNERS)[number];
export const OD_PARTNER_LABEL: Record<OdPartner, string> = { '99food': '99Food', keeta: 'Keeta' };

interface Money {
	value: number;
	currency?: string;
}

export interface OdOrderOption {
	id?: string;
	name: string;
	externalCode?: string;
	quantity: number;
	unitPrice: Money;
	totalPrice?: Money;
}

export interface OdOrderItem {
	id?: string;
	name: string;
	externalCode?: string;
	quantity: number;
	unitPrice: Money;
	totalPrice: Money;
	specialInstructions?: string;
	options?: OdOrderOption[];
}

export interface OdOrder {
	id: string;
	displayId?: string;
	type: 'DELIVERY' | 'TAKEOUT' | 'INDOOR' | string;
	createdAt?: string;
	customer?: { name?: string; phone?: { number?: string } };
	items: OdOrderItem[];
	otherFees?: { type?: string; price: Money }[];
	discounts?: { amount: Money }[];
	total: { itemsPrice: Money; otherFees?: Money; discount?: Money; orderAmount: Money };
	payments?: { prepaid?: number; pending?: number };
	delivery?: {
		deliveredBy?: 'MARKETPLACE' | 'MERCHANT' | string;
		deliveryAddress?: {
			street?: string;
			number?: string;
			complement?: string;
			district?: string;
			city?: string;
			state?: string;
			postalCode?: string;
			reference?: string;
			formattedAddress?: string;
		};
	};
	extraInfo?: string;
	isTest?: boolean;
}

const cents = (m: Money | number | undefined | null) =>
	Math.round((typeof m === 'number' ? m : (m?.value ?? 0)) * 100);

export function mapOdOrder(
	order: OdOrder,
	partner: OdPartner,
	lookup: (code: string) => ProductInfo | null
): ExternalOrder {
	const label = OD_PARTNER_LABEL[partner];
	const unmapped: string[] = [];
	const lines: PricedLine[] = order.items.map((item, index) => {
		const code = item.externalCode?.trim() || '';
		const product = code ? lookup(code) : null;
		if (!product) unmapped.push(code || item.name);
		const quantity = Math.max(1, Math.round(item.quantity));
		const unitPriceCents = cents(item.unitPrice);
		const totalCents = cents(item.totalPrice);
		const modifiersUnitCents = Math.max(0, Math.round(totalCents / quantity) - unitPriceCents);
		return {
			position: index + 1,
			productSku: product?.sku ?? `OD:${code || item.id || index + 1}`,
			productName: item.name,
			categoryName: product?.categoryName ?? null,
			quantity,
			unitPriceCents,
			modifiersUnitCents,
			lineTotalCents: quantity * (unitPriceCents + modifiersUnitCents),
			note: item.specialInstructions?.trim() || null,
			allergyFlag: /alerg/i.test(item.specialInstructions ?? ''),
			prepStation: product?.prepStation ?? 'grill',
			modifiers: (item.options ?? []).map((o) => ({
				groupName: 'Opções',
				optionSku: o.externalCode?.trim() || `OD:${o.id ?? o.name}`,
				optionName: o.name,
				quantity: Math.max(1, Math.round(o.quantity)),
				unitPriceCents: cents(o.unitPrice),
				kind: 'add' as const
			}))
		};
	});
	const subtotalCents = lines.reduce((n, l) => n + l.lineTotalCents, 0);
	const delivery = order.type === 'DELIVERY';
	const a = order.delivery?.deliveryAddress;
	const name = order.customer?.name?.trim() || `Cliente ${label}`;
	const pending = cents(order.payments?.pending);
	const prepaid = cents(order.payments?.prepaid);
	return {
		channelOrderId: order.id,
		displayId: order.displayId ?? null,
		cart: { catalogVersion: `od-${partner}`, lines, subtotalCents },
		deliveryFeeCents: cents(order.total.otherFees),
		discountCents: Math.min(cents(order.total.discount), subtotalCents),
		channelTotalCents: cents(order.total.orderAmount),
		fulfillmentType: delivery ? 'delivery' : 'pickup',
		fulfillmentProvider: delivery
			? order.delivery?.deliveredBy === 'MERCHANT'
				? 'own_driver'
				: 'partner_courier'
			: 'shop',
		customer: order.customer?.name ? { name } : undefined,
		customerLabel: order.displayId ? `${name} · ${label} ${order.displayId}` : name,
		address:
			delivery && a
				? {
						recipient: name,
						cep: (a.postalCode ?? '').replace(/\D/g, '').padEnd(8, '0').slice(0, 8),
						street: a.street || a.formattedAddress || `Endereço no ${label}`,
						number: a.number || 's/n',
						complement: a.complement || null,
						neighborhood: a.district || '-',
						city: a.city || '-',
						state: (a.state || 'SP').slice(0, 2).toUpperCase(),
						instructions: a.reference || null
					}
				: undefined,
		paymentStatus: pending === 0 && prepaid > 0 ? 'paid' : 'pending',
		notes: order.extraInfo?.trim() || null,
		isTest: order.isTest === true,
		unmappedCodes: unmapped
	};
}

/** What an Open Delivery event means for us. TODO(verify) the event type list per partner. */
export function odMeaning(type: string): EventMeaning {
	switch (type) {
		case 'CREATED':
			return { kind: 'placed' };
		case 'CONFIRMED':
			return { kind: 'status', to: 'confirmed' };
		case 'READY_FOR_PICKUP':
		case 'DISPATCHED':
			return { kind: 'status', to: 'ready' };
		case 'DELIVERED':
		case 'CONCLUDED':
			return { kind: 'status', to: 'completed' };
		case 'CANCELLED':
			return { kind: 'status', to: 'cancelled' };
		case 'CANCELLATION_REQUEST_DENIED':
			return { kind: 'cancelDenied' };
		default:
			return { kind: 'ignore' };
	}
}

export type OdAction = 'confirm' | 'readyForPickup' | 'dispatch' | 'requestCancellation';

/** The Open Delivery call that mirrors one of our status changes. */
export function odOutboundAction(
	to: OrderStatus,
	fulfillment: { type: string; provider: string }
): OdAction | null {
	switch (to) {
		case 'confirmed':
			return 'confirm';
		case 'ready':
			return fulfillment.type === 'delivery' && fulfillment.provider === 'own_driver'
				? 'dispatch'
				: 'readyForPickup';
		case 'rejected':
		case 'cancelled':
			return 'requestCancellation';
		default:
			return null;
	}
}
