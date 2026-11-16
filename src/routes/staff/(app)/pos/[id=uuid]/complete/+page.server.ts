import { error } from '@sveltejs/kit';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { getOrderDetail } from '#lib/server/orders/queries.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'pos.sell');
	const order = await getOrderDetail(event.params.id);
	if (!order) error(404, 'Pedido não encontrado.');
	return { order };
};
