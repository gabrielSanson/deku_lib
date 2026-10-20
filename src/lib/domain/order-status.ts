// One canonical order lifecycle for every channel. Payment and delivery have
// their own status fields; they are not order states.

export const ORDER_STATUSES = [
	'new',
	'confirmed',
	'preparing',
	'ready',
	'completed',
	'cancelled',
	'rejected'
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'cancelled', 'refunded', 'unknown'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type StaffRole = 'owner' | 'manager' | 'cashier' | 'kitchen';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
	new: ['confirmed', 'rejected', 'cancelled'],
	confirmed: ['preparing', 'cancelled'],
	preparing: ['ready', 'cancelled'],
	ready: ['completed', 'cancelled'],
	completed: [],
	cancelled: [],
	rejected: []
};

export const TERMINAL_STATUSES: OrderStatus[] = ['completed', 'cancelled', 'rejected'];
export const OPEN_STATUSES: OrderStatus[] = ['new', 'confirmed', 'preparing', 'ready'];

export function allowedNextStatuses(from: OrderStatus): OrderStatus[] {
	return TRANSITIONS[from];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
	return TRANSITIONS[from].includes(to);
}

/** Which roles may move an order into a given status. */
export function roleMayTransition(role: StaffRole, from: OrderStatus, to: OrderStatus): boolean {
	if (!canTransition(from, to)) return false;
	if (to === 'cancelled') {
		// Once the kitchen has started, only managers and owners may cancel.
		return from === 'new' || from === 'confirmed'
			? role !== 'kitchen'
			: role === 'manager' || role === 'owner';
	}
	if (to === 'rejected' || to === 'confirmed') return role !== 'kitchen';
	if (to === 'completed') return role !== 'kitchen' || from === 'ready';
	return true;
}

export function requiresReason(to: OrderStatus): boolean {
	return to === 'cancelled' || to === 'rejected';
}

/** Timestamp column set on first entry into a status. */
export const STATUS_TIMESTAMP: Partial<Record<OrderStatus, string>> = {
	confirmed: 'accepted_at',
	preparing: 'preparing_at',
	ready: 'ready_at',
	completed: 'completed_at',
	cancelled: 'cancelled_at',
	rejected: 'cancelled_at'
};

export const STATUS_LABEL_PT: Record<OrderStatus, string> = {
	new: 'Novo',
	confirmed: 'Confirmado',
	preparing: 'Em preparo',
	ready: 'Pronto',
	completed: 'Concluído',
	cancelled: 'Cancelado',
	rejected: 'Recusado'
};

export const PAYMENT_LABEL_PT: Record<PaymentStatus, string> = {
	pending: 'Pendente',
	paid: 'Pago',
	failed: 'Falhou',
	cancelled: 'Cancelado',
	refunded: 'Estornado',
	unknown: 'Desconhecido'
};
