// Pure translation between iFood order payloads and our order model.
// Shapes follow iFood's Order API v1.0 as documented (UNVERIFIED until homologation).
// Money arrives in reais as decimals and is converted to integer centavos here.
import type { PricedCart, PricedLine } from '#lib/domain/pricing.ts';
import type { OrderStatus, PaymentStatus } from '#lib/domain/order-status.ts';

export interface IfoodOrderOption {
	id?: string;
	name: string;
	externalCode?: string;
	quantity: number;
	unitPrice: number;
	price?: number;
	groupName?: string;
}

export interface IfoodOrderItem {
	id?: string;
	name: string;
	externalCode?: string;
	quantity: number;
	unitPrice: number;
	optionsPrice?: number;
	totalPrice: number;
	observations?: string;
	options?: IfoodOrderOption[];
}

export interface IfoodOrder {
	id: string;
	displayId?: string;
	orderType: 'DELIVERY' | 'TAKEOUT' | 'INDOOR' | string;
	orderTiming?: 'IMMEDIATE' | 'SCHEDULED' | string;
	isTest?: boolean;
	extraInfo?: string;
	customer?: { name?: string; phone?: { number?: string; localizer?: string } };
	items: IfoodOrderItem[];
	total: {
		subTotal: number;
		deliveryFee?: number;
		additionalFees?: number;
		benefits?: number;
		orderAmount: number;
	};
	payments?: {
		prepaid?: number;
		pending?: number;
		methods?: { method?: string; type?: 'ONLINE' | 'OFFLINE' | string; value?: number }[];
	};
	delivery?: {
		deliveredBy?: 'IFOOD' | 'MERCHANT' | string;
		deliveryAddress?: {
			streetName?: string;
			streetNumber?: string;
			complement?: string;
			neighborhood?: string;
			city?: string;
			state?: string;
			postalCode?: string;
			reference?: string;
			formattedAddress?: string;
		};
	};
}

export const cents = (reais: number | undefined | null) => Math.round((reais ?? 0) * 100);

export interface ProductInfo {
	sku: string;
	categoryName: string | null;
	prepStation: string;
}

export interface MappedIfoodOrder {
	channelOrderId: string;
	displayId: string | null;
	cart: PricedCart;
	deliveryFeeCents: number;
	discountCents: number;
	channelTotalCents: number;
	fulfillmentType: 'pickup' | 'delivery';
	fulfillmentProvider: 'ifood_courier' | 'own_driver' | 'shop';
	customer: { name: string } | undefined;
	customerLabel: string;
	address:
		| {
				recipient: string;
				cep: string;
				street: string;
				number: string;
				complement: string | null;
				neighborhood: string;
				city: string;
				state: string;
				instructions: string | null;
		  }
		| undefined;
	paymentStatus: PaymentStatus;
	notes: string | null;
	isTest: boolean;
	unmappedCodes: string[];
}

/**
 * @param lookup resolves an iFood externalCode to our product. By convention the
 * externalCode registered in the iFood menu is our SKU; integration_mappings can override.
 */
export function mapIfoodOrder(
	order: IfoodOrder,
	lookup: (code: string) => ProductInfo | null
): MappedIfoodOrder {
	const unmapped: string[] = [];
	const lines: PricedLine[] = order.items.map((item, index) => {
		const code = item.externalCode?.trim() || '';
		const product = code ? lookup(code) : null;
		if (!product) unmapped.push(code || item.name);
		const quantity = Math.max(1, Math.round(item.quantity));
		const unitPriceCents = cents(item.unitPrice);
		const totalCents = cents(item.totalPrice);
		// Store the line so quantity × (unit + modifiers) equals what iFood charged.
		const modifiersUnitCents = Math.max(0, Math.round(totalCents / quantity) - unitPriceCents);
		const allergy = /alerg/i.test(item.observations ?? '');
		return {
			position: index + 1,
			productSku: product?.sku ?? `IFOOD:${code || item.id || index + 1}`,
			productName: item.name,
			categoryName: product?.categoryName ?? null,
			quantity,
			unitPriceCents,
			modifiersUnitCents,
			lineTotalCents: quantity * (unitPriceCents + modifiersUnitCents),
			note: item.observations?.trim() || null,
			allergyFlag: allergy,
			prepStation: product?.prepStation ?? 'grill',
			modifiers: (item.options ?? []).map((o) => ({
				groupName: o.groupName ?? 'Opções',
				optionSku: o.externalCode?.trim() || `IFOOD:${o.id ?? o.name}`,
				optionName: o.name,
				quantity: Math.max(1, Math.round(o.quantity)),
				unitPriceCents: cents(o.unitPrice)
			}))
		};
	});
	const subtotalCents = lines.reduce((n, l) => n + l.lineTotalCents, 0);
	const delivery = order.orderType === 'DELIVERY';
	const a = order.delivery?.deliveryAddress;
	const name = order.customer?.name?.trim() || 'Cliente iFood';
	const prepaid = cents(order.payments?.prepaid);
	const pending = cents(order.payments?.pending);
	const channelTotalCents = cents(order.total.orderAmount);
	return {
		channelOrderId: order.id,
		displayId: order.displayId ?? null,
		cart: { catalogVersion: 'ifood', lines, subtotalCents },
		deliveryFeeCents: cents(order.total.deliveryFee) + cents(order.total.additionalFees),
		discountCents: Math.min(cents(order.total.benefits), subtotalCents),
		channelTotalCents,
		fulfillmentType: delivery ? 'delivery' : 'pickup',
		fulfillmentProvider: delivery
			? order.delivery?.deliveredBy === 'MERCHANT'
				? 'own_driver'
				: 'ifood_courier'
			: 'shop',
		customer: order.customer?.name ? { name } : undefined,
		customerLabel: order.displayId ? `${name} · iFood ${order.displayId}` : name,
		address:
			delivery && a
				? {
						recipient: name,
						cep: (a.postalCode ?? '').replace(/\D/g, '').padEnd(8, '0').slice(0, 8),
						street: a.streetName || a.formattedAddress || 'Endereço no iFood',
						number: a.streetNumber || 's/n',
						complement: a.complement || null,
						neighborhood: a.neighborhood || '-',
						city: a.city || '-',
						state: (a.state || 'SP').slice(0, 2).toUpperCase(),
						instructions: a.reference || null
					}
				: undefined,
		// iFood collects online payments itself; cash/card on delivery stays pending with us.
		paymentStatus: pending === 0 && prepaid > 0 ? 'paid' : 'pending',
		notes: order.extraInfo?.trim() || null,
		isTest: order.isTest === true,
		unmappedCodes: unmapped
	};
}

/** iFood event codes we act on. Others are stored and marked ignored. */
export const IFOOD_EVENT = {
	PLC: 'PLACED',
	CFM: 'CONFIRMED',
	RTP: 'READY_TO_PICKUP',
	DSP: 'DISPATCHED',
	CON: 'CONCLUDED',
	CAN: 'CANCELLED',
	CAR: 'CANCELLATION_REQUESTED'
} as const;

/** The order status an inbound iFood event implies, if any. */
export function statusForEvent(code: string): OrderStatus | null {
	switch (code) {
		case 'CFM':
		case 'CONFIRMED':
			return 'confirmed';
		case 'RTP':
		case 'READY_TO_PICKUP':
		case 'DSP':
		case 'DISPATCHED':
			return 'ready';
		case 'CON':
		case 'CONCLUDED':
			return 'completed';
		case 'CAN':
		case 'CANCELLED':
			return 'cancelled';
		default:
			return null;
	}
}

export function isPlaced(code: string) {
	return code === 'PLC' || code === 'PLACED';
}

/** The iFood call that mirrors one of our status changes. */
export function outboundAction(
	to: OrderStatus,
	fulfillment: { type: string; provider: string }
): 'confirm' | 'startPreparation' | 'readyToPickup' | 'dispatch' | 'requestCancellation' | null {
	switch (to) {
		case 'confirmed':
			return 'confirm';
		case 'preparing':
			return 'startPreparation';
		case 'ready':
			if (fulfillment.type === 'delivery' && fulfillment.provider === 'own_driver')
				return 'dispatch';
			return 'readyToPickup';
		case 'rejected':
		case 'cancelled':
			return 'requestCancellation';
		default:
			return null;
	}
}
