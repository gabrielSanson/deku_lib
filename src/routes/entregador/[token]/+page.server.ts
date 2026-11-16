// The courier's private link (S5.3): today's runs, "Saiu" and "Entregue". No login; the link is
// the credential and the owner can replace it from Entregas.
import { error, fail } from '@sveltejs/kit';
import { attempt, formString } from '#lib/server/actions.ts';
import {
	courierByToken,
	courierRuns,
	mapLink,
	markDelivered,
	markLeft
} from '#lib/server/delivery/couriers.ts';
import { getStoreProfile } from '#lib/server/settings/profile.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const courier = await courierByToken(params.token);
	if (!courier) error(404, 'Link de entregador inválido.');
	setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });
	const runs = await courierRuns(courier.id);
	return {
		shop: (await getStoreProfile()).displayName,
		courier: { name: courier.name },
		runs: runs.map((r) => ({ ...r, orders: r.orders.map((o) => ({ ...o, map: mapLink(o) })) }))
	};
};

export const actions: Actions = {
	left: async ({ params, request }) => {
		const courier = await courierByToken(params.token);
		if (!courier) return fail(404, {});
		const id = formString(await request.formData(), 'runId');
		return attempt(async () => {
			await markLeft(id, { type: 'integration', id: null }, courier.id);
			return { ok: true };
		});
	},
	delivered: async ({ params, request }) => {
		const courier = await courierByToken(params.token);
		if (!courier) return fail(404, {});
		const id = formString(await request.formData(), 'orderId');
		return attempt(async () => {
			await markDelivered(id, { type: 'integration', id: null }, courier.id);
			return { ok: true };
		});
	}
};
