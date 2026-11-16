import { attempt, formString } from '#lib/server/actions.ts';
import { requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { listOrders, orderStatusCounts } from '#lib/server/orders/queries.ts';
import { callOrder, transitionOrder } from '#lib/server/orders/service.ts';
import type { OrderStatus } from '#lib/domain/order-status.ts';
import { markConversationHandled, waitingConversations } from '#lib/server/whatsapp/service.ts';
import type { Actions, PageServerLoad } from './$types';

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
	const q = (event.url.searchParams.get('q') ?? '').trim().toLowerCase();
	const [found, counts] = await Promise.all([
		listOrders({
			statuses: FILTERS[status] ?? FILTERS.active,
			channel: channel || undefined,
			since: status === 'active' ? undefined : new Date(Date.now() - 3 * 86400_000),
			limit: 200
		}),
		orderStatusCounts(channel || undefined)
	]);
	// Search matches order number, customer name or table, so staff can find a ticket by what they heard.
	const orders = q
		? found.filter((o) =>
				[o.orderNumber, o.customerLabel, o.tableLabel].some((v) =>
					String(v ?? '')
						.toLowerCase()
						.includes(q)
				)
			)
		: found;
	const count = (...keys: string[]) => keys.reduce((n, k) => n + (counts[k] ?? 0), 0);
	const tabCounts: Record<string, number> = {
		active: count('new', 'confirmed', 'preparing', 'ready'),
		new: count('new'),
		open: count('confirmed', 'preparing'),
		ready: count('ready'),
		done: count('completed'),
		cancelled: count('cancelled', 'rejected'),
		all: count(...Object.keys(counts))
	};
	// Customers who asked the WhatsApp bot for a person; staff answer from the shop's phone.
	const whatsappWaiting = await waitingConversations().catch(() => []);
	return {
		orders,
		status,
		channel: channel ?? '',
		q,
		tabCounts,
		whatsappWaiting,
		loadedAt: new Date()
	};
};

export const actions: Actions = {
	/** The WhatsApp customer who asked for a person was answered. */
	waHandled: async (event) => {
		requireStaff(event);
		const phone = formString(await event.request.formData(), 'phone');
		if (phone) await markConversationHandled(phone);
		return { ok: true };
	},
	/** "Chamar": the attendant called a ready order out loud. */
	call: async (event) => {
		const staff = requireStaff(event);
		const id = formString(await event.request.formData(), 'orderId');
		return attempt(async () => {
			await callOrder(id, staffActor(staff));
			return { ok: true };
		});
	},
	/** "Iniciar preparo": only confirmed orders move to the kitchen's preparing lane. */
	start: async (event) => {
		const staff = requireStaff(event);
		const data = await event.request.formData();
		return attempt(async () => {
			await transitionOrder({
				orderId: formString(data, 'orderId'),
				to: 'preparing',
				actor: staffActor(staff)
			});
			return { ok: true };
		});
	}
};
