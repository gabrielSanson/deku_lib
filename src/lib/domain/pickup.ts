// The order number is the pickup code (owner decision, 21 Oct 2026): the same
// code shows on the phone, the till, the kitchen ticket and the TV board.
import type { OrderStatus } from './order-status';

/**
 * The code staff read out and customers look for. Open question: whether to
 * call only the last 3 digits. Until decided, it is the full order number.
 */
export function pickupCode(orderNumber: number): string {
	return String(orderNumber);
}

/** Staff can call an order out ("Chamar") once it is ready, as often as needed. */
export function mayCall(status: OrderStatus): boolean {
	return status === 'ready';
}
