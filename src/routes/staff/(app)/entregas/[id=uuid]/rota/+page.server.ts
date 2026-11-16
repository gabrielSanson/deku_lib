import { error } from '@sveltejs/kit';
import { COUNTER, requireStaff } from '#lib/server/auth/staff.ts';
import { getRun, mapLink } from '#lib/server/delivery/couriers.ts';
import type { PageServerLoad } from './$types';

// A printable route list for the courier: addresses in order, with map links.
export const load: PageServerLoad = async (event) => {
	requireStaff(event, COUNTER);
	const run = await getRun(event.params.id);
	if (!run) error(404, 'Entrega não encontrada.');
	return { run: { ...run, orders: run.orders.map((o) => ({ ...o, map: mapLink(o) })) } };
};
