import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { getsReadyAlert } from '#lib/domain/pickup.ts';
import { attempt } from '#lib/server/actions.ts';
import { pushPublicKey, savePushSubscription } from '#lib/server/notifications/push.ts';
import { getPublicOrder } from '#lib/server/orders/queries.ts';
import { rateLimit } from '#lib/server/rate-limit.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, depends, setHeaders }) => {
	depends('app:public-order');
	const order = await getPublicOrder(params.token);
	if (!order) error(404, 'Pedido não encontrado.');
	// The shop layout already sends cache-control: no-store; setting it twice throws.
	setHeaders({ 'x-robots-tag': 'noindex' });
	return {
		order,
		// Null when this server can't send web push; the page then beeps while open instead.
		pushKey: getsReadyAlert(order.fulfillmentType) ? await pushPublicKey() : null
	};
};

const subscription = z.object({
	endpoint: z.string().url().startsWith('https://').max(1000),
	p256dh: z.string().min(16).max(200),
	auth: z.string().min(8).max(100)
});

export const actions: Actions = {
	/** "Avisar quando ficar pronto": save this phone's push subscription on the order. */
	notify: async ({ params, request, getClientAddress }) => {
		if (!rateLimit(`push:${getClientAddress()}`, 10, 10 * 60_000)) return fail(429, {});
		const d = await request.formData();
		const parsed = subscription.safeParse({
			endpoint: d.get('endpoint'),
			p256dh: d.get('p256dh'),
			auth: d.get('auth')
		});
		if (!parsed.success || !/^[0-9a-f]{36}$/.test(params.token)) return fail(400, {});
		return attempt(async () => {
			await savePushSubscription(params.token, parsed.data);
			return { notifyOn: true };
		});
	}
};
