import { error } from '@sveltejs/kit';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { getRun, mapLink } from '#lib/server/delivery/couriers.ts';
import type { PageServerLoad } from './$types';

// A printable route list for the courier: addresses in order, with map links.
export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'pos.sell');
	const run = await getRun(event.params.id);
	if (!run) error(404, 'Entrega não encontrada.');
	return { run: { ...run, orders: run.orders.map((o) => ({ ...o, map: mapLink(o) })) } };
};
