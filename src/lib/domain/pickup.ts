// The pickup code comes from the order number (owner decisions, 21 and 23 Oct 2026):
// staff call the last 3 digits, so screens show those large and the full number small.
// The same code shows on the phone, the till, the kitchen ticket and the TV board.
import type { Fulfillment } from './fulfillment';
import type { OrderStatus } from './order-status';

/**
 * The code staff read out and customers look for: the last 3 digits of the order
 * number. Two open orders can share it only after 1000 more orders, so the full
 * number stays visible next to it to tell them apart.
 */
export function pickupCode(orderNumber: number): string {
	return String(orderNumber).slice(-3).padStart(3, '0');
}

/** Staff can call an order out ("Chamar") once it is ready, as often as needed. */
export function mayCall(status: OrderStatus): boolean {
	return status === 'ready';
}

/** Who gets the "ready" alert: everyone collecting at the counter, not delivery orders. */
export function getsReadyAlert(fulfillment: Fulfillment): boolean {
	return fulfillment !== 'delivery';
}
