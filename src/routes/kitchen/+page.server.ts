import { fail } from '@sveltejs/kit';
import { attempt, formString } from '#lib/server/actions.ts';
import { requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { listKitchenOrders } from '#lib/server/orders/queries.ts';
import { callOrder, markKitchenSeen, transitionOrder } from '#lib/server/orders/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event);
	event.depends('app:orders');
	return { orders: await listKitchenOrders(), loadedAt: new Date() };
};

export const actions: Actions = {
	seen: async (event) => {
		const staff = requireStaff(event);
		const id = formString(await event.request.formData(), 'orderId');
		await markKitchenSeen(id, staffActor(staff));
		return { ok: true };
	},
	call: async (event) => {
		const staff = requireStaff(event);
		const id = formString(await event.request.formData(), 'orderId');
		return attempt(async () => {
			await callOrder(id, staffActor(staff));
			return { ok: true };
		});
	},
	move: async (event) => {
		const staff = requireStaff(event);
		const data = await event.request.formData();
		const to = formString(data, 'to');
		if (to !== 'preparing' && to !== 'ready' && to !== 'completed')
			return fail(400, { error: 'Ação inválida.' });
		return attempt(async () => {
			await transitionOrder({ orderId: formString(data, 'orderId'), to, actor: staffActor(staff) });
			return { ok: true };
		});
	}
};
