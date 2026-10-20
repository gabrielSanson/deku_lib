import { requireStaff } from '#lib/server/auth/staff.ts';
import { listOrders } from '#lib/server/orders/queries.ts';
import type { OrderStatus } from '#lib/domain/order-status.ts';
import type { PageServerLoad } from './$types';

const FILTERS: Record<string, OrderStatus[] | undefined> = {
	new: ['new'],
	open: ['confirmed', 'preparing'],
	ready: ['ready'],
	active: ['new', 'confirmed', 'preparing', 'ready'],
	done: ['completed'],
	cancelled: ['cancelled', 'rejected'],
	all: undefined
};

export const load: PageServerLoad = async (event) => {
	requireStaff(event);
	event.depends('app:orders');
	const status = event.url.searchParams.get('status') ?? 'active';
	const channel = event.url.searchParams.get('channel') ?? undefined;
	const orders = await listOrders({
		statuses: FILTERS[status] ?? FILTERS.active,
		channel: channel || undefined,
		since: status === 'active' ? undefined : new Date(Date.now() - 3 * 86400_000),
		limit: 200
	});
	return { orders, status, channel: channel ?? '' };
};
