import { error, fail } from '@sveltejs/kit';
import { ORDER_STATUSES, type OrderStatus } from '#lib/domain/order-status.ts';
import { attempt, formString } from '#lib/server/actions.ts';
import { requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { getOrderDetail } from '#lib/server/orders/queries.ts';
import { transitionOrder } from '#lib/server/orders/service.ts';
import { refundTender } from '#lib/server/payments/tenders.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const staff = requireStaff(event);
	event.depends('app:orders');
	const order = await getOrderDetail(event.params.id);
	if (!order) error(404, 'Pedido não encontrado.');
	// Kitchen staff do not need customer contact or address details.
	if (staff.role === 'kitchen') order.address = null;
	return { order };
};

export const actions: Actions = {
	transition: async (event) => {
		const staff = requireStaff(event);
		const data = await event.request.formData();
		const to = formString(data, 'to') as OrderStatus;
		if (!ORDER_STATUSES.includes(to)) return fail(400, { error: 'Status inválido.' });
		const version = Number(formString(data, 'version'));
		return attempt(async () => {
			await transitionOrder({
				orderId: event.params.id,
				to,
				actor: staffActor(staff),
				reason: formString(data, 'reason') || null,
				expectedVersion: Number.isFinite(version) && version > 0 ? version : undefined
			});
			return { ok: true };
		});
	},
	refund: async (event) => {
		const staff = requireStaff(event);
		const data = await event.request.formData();
		return attempt(async () => {
			await refundTender(
				formString(data, 'tenderId'),
				formString(data, 'reason'),
				staffActor(staff)
			);
			return { ok: true };
		});
	}
};
