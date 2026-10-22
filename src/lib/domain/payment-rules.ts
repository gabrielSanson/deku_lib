// Owner rule (21 Oct 2026): every order is paid when it is placed. There is no
// pay on pickup or on delivery, and an order reaches the kitchen only once paid.
import type { OrderStatus, PaymentStatus } from './order-status';

/**
 * How an order is paid. `on_fulfillment` is no longer offered; it stays in the
 * type only so orders placed before the rule still load.
 */
export type PaymentPlan = 'counter' | 'online' | 'pix_key' | 'channel' | 'on_fulfillment';

/** What a site customer can pay with: a provider checkout, or Pix to the shop's key. */
export const WEB_PAYMENT_METHODS = ['pix', 'online_card', 'pix_key'] as const;
export type WebPaymentMethod = (typeof WEB_PAYMENT_METHODS)[number];

/** The totem can also take the order now and leave payment to the counter. */
export type CheckoutPaymentMethod = WebPaymentMethod | 'counter';

export function webPaymentPlan(method: CheckoutPaymentMethod): PaymentPlan {
	if (method === 'counter') return 'counter';
	return method === 'pix_key' ? 'pix_key' : 'online';
}

/**
 * Plans whose orders wait as "new" (out of the kitchen) until fully paid and
 * then confirm by themselves. iFood collects its own payment, so it is not here.
 */
const CONFIRM_ON_PAYMENT: PaymentPlan[] = ['online', 'pix_key', 'counter'];

export function waitsForPayment(plan: PaymentPlan): boolean {
	return CONFIRM_ON_PAYMENT.includes(plan);
}

/** An order that waits for payment may not be sent to the kitchen by hand before it is paid. */
export function mayConfirm(plan: PaymentPlan, payment: PaymentStatus): boolean {
	return !waitsForPayment(plan) || payment === 'paid';
}

/** True when a payment that just settled should send the order to the kitchen. */
export function confirmsOnPayment(
	plan: PaymentPlan,
	status: OrderStatus,
	payment: PaymentStatus
): boolean {
	return payment === 'paid' && status === 'new' && waitsForPayment(plan);
}
