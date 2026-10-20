import { error } from '@sveltejs/kit';
import { getPublicOrder } from '#lib/server/orders/queries.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, depends, setHeaders }) => {
	depends('app:public-order');
	const order = await getPublicOrder(params.token);
	if (!order) error(404, 'Pedido não encontrado.');
	setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });
	return { order };
};
