import { error } from '@sveltejs/kit';
import { ORDER_STATUSES, type OrderStatus } from '#lib/domain/order-status.ts';
import { attempt, failText, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import {
	cancelFiscal,
	getFiscalSettings,
	listFiscalDocuments,
	retryFiscal
} from '#lib/server/fiscal/service.ts';
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
	const fiscal =
		staff.role === 'kitchen'
			? null
			: {
					enabled: (await getFiscalSettings()).enabled,
					documents: await listFiscalDocuments(order.id)
				};
	return { order, fiscal };
};

export const actions: Actions = {
	transition: async (event) => {
		const staff = requireStaff(event);
		const data = await event.request.formData();
		const to = formString(data, 'to') as OrderStatus;
		if (!ORDER_STATUSES.includes(to)) return failText(400, 'err.order.badStatus');
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
	},
	fiscalRetry: async (event) => {
		const staff = requireStaff(event, ADMIN);
		return attempt(async () => {
			await retryFiscal(event.params.id, staffActor(staff));
			return { ok: true };
		});
	},
	fiscalCancel: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const data = await event.request.formData();
		return attempt(async () => {
			await cancelFiscal(event.params.id, formString(data, 'reason'), staffActor(staff));
			return { ok: true };
		});
	}
};
