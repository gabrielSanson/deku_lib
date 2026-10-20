import { error } from '@sveltejs/kit';
import { ADMIN, requireStaff } from '#lib/server/auth/staff.ts';
import { getOrderDetail } from '#lib/server/orders/queries.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const order = await getOrderDetail(event.params.id);
	if (!order) error(404, 'Pedido não encontrado.');
	return { order };
};
