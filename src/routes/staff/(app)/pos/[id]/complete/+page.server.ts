import { error } from '@sveltejs/kit';
import { FRONT_OF_HOUSE, requireStaff } from '#lib/server/auth/staff.ts';
import { getOrderDetail } from '#lib/server/orders/queries.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, FRONT_OF_HOUSE);
	const order = await getOrderDetail(event.params.id);
	if (!order) error(404, 'Pedido não encontrado.');
	return { order };
};
