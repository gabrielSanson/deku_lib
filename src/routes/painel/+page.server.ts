import { listBoardOrders } from '#lib/server/orders/queries.ts';
import { getStoreProfile } from '#lib/server/settings/profile.ts';
import type { PageServerLoad } from './$types';

// The screen in the room: public, codes only, refreshed by the page every few seconds.
export const load: PageServerLoad = async (event) => {
	event.depends('app:board');
	event.setHeaders({ 'cache-control': 'no-store' });
	const [orders, shop] = await Promise.all([listBoardOrders(), getStoreProfile()]);
	return { orders, shopName: shop.displayName };
};
