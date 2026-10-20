import { error, fail, redirect } from '@sveltejs/kit';
import { parseBRL } from '#lib/domain/money.ts';
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { getOrderDetail } from '#lib/server/orders/queries.ts';
import { transitionOrder } from '#lib/server/orders/service.ts';
import {
	MANUAL_METHODS,
	recordManualTender,
	type ManualMethod
} from '#lib/server/payments/tenders.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const order = await getOrderDetail(event.params.id);
	if (!order) error(404, 'Pedido não encontrado.');
	const paidCents = order.tenders
		.filter((t) => t.status === 'paid')
		.reduce((n, t) => n + t.amountCents, 0);
	return { order, paidCents, remainingCents: Math.max(0, order.totalCents - paidCents) };
};

export const actions: Actions = {
	pay: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const data = await event.request.formData();
		const method = formString(data, 'method') as ManualMethod;
		if (!MANUAL_METHODS.includes(method))
			return fail(400, { error: 'Forma de pagamento inválida.' });
		const amountCents = parseBRL(formString(data, 'amount'));
		if (!amountCents) return fail(400, { error: 'Informe o valor.' });
		const received = formString(data, 'received');
		const result = await attempt(() =>
			recordManualTender({
				orderId: event.params.id,
				method,
				amountCents,
				cashReceivedCents: received ? parseBRL(received) : null,
				providerReference: formString(data, 'reference') || null,
				idempotencyKey: formString(data, 'idempotencyKey'),
				actor: staffActor(staff)
			})
		);
		if ('changeCents' in result) return { ok: true, changeCents: result.changeCents };
		return result;
	},
	cancel: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const data = await event.request.formData();
		const result = await attempt(() =>
			transitionOrder({
				orderId: event.params.id,
				to: 'cancelled',
				actor: staffActor(staff),
				reason: formString(data, 'reason') || 'Cancelado no caixa antes do pagamento'
			})
		);
		if ('changed' in result) redirect(303, '/staff/pos');
		return result;
	}
};
