// "Como foi?": rate a completed order from 1 to 5 stars. The token is the order's tracking token.
import { error, fail } from '@sveltejs/kit';
import { attempt, formString } from '#lib/server/actions.ts';
import { ratingPage, rateOrder } from '#lib/server/customers/ratings.ts';
import { clientKey, rateLimit } from '#lib/server/rate-limit.ts';
import { getTexts } from '#lib/server/settings/texts.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const page = await ratingPage(params.token);
	if (!page) error(404, 'Pedido não encontrado.');
	setHeaders({ 'x-robots-tag': 'noindex' });
	return page;
};

export const actions: Actions = {
	default: async (event) => {
		const texts = await getTexts();
		if (!rateLimit(`rating:${clientKey(event)}`, 10, 10 * 60_000))
			return fail(429, { error: texts['checkout.error.tooMany'] });
		const d = await event.request.formData();
		const stars = Number(d.get('stars'));
		return attempt(async () => {
			await rateOrder(event.params.token, stars, formString(d, 'comment'));
			return { rated: stars };
		});
	}
};
