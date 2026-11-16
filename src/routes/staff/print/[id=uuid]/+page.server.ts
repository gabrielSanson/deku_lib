import { error } from '@sveltejs/kit';
import { requireStaff } from '#lib/server/auth/staff.ts';
import { getOrderDetail } from '#lib/server/orders/queries.ts';
import { getStoreProfile } from '#lib/server/settings/profile.ts';
import { db } from '#lib/server/db.ts';
import type { PageServerLoad } from './$types';

// An 80 mm ticket printed from the browser: the kitchen ticket (no prices) or the
// customer receipt. Any signed-in staff member can print, the kitchen included.
export const load: PageServerLoad = async (event) => {
	requireStaff(event);
	const order = await getOrderDetail(event.params.id);
	if (!order) error(404, 'Pedido não encontrado.');
	const kind = event.url.searchParams.get('tipo') === 'recibo' ? 'receipt' : 'kitchen';
	const shop = await getStoreProfile();
	return {
		order,
		kind: kind as 'receipt' | 'kitchen',
		auto: event.url.searchParams.has('auto'),
		/** The NFC-e went out in offline contingency: the receipt says so (S5.5). */
		fiscalContingency:
			kind === 'receipt' &&
			(
				await db()`select 1 from fiscal_documents where order_id = ${order.id} and status = 'contingency'`
			).length > 0,
		shop: { name: shop.displayName, phone: shop.phone, address: shop.addressLine, city: shop.city }
	};
};
