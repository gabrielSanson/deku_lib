// Open Delivery events for one shop and partner: /api/v1/integrations/opendelivery/<partner>/<shop id>.
// [UNVERIFIED] TODO(verify): the signature header and scheme with each partner.
import { json } from '@sveltejs/kit';
import { isOdPartner, receiveOdWebhook } from '#lib/server/integrations/opendelivery/service.ts';
import { forShopInPath } from '#lib/server/platform/webhooks.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const partner = params.partner;
	if (!isOdPartner(partner)) return json({ ok: false }, { status: 404 });
	return forShopInPath(params.shop, async () => {
		const raw = new Uint8Array(await request.arrayBuffer());
		const { status } = await receiveOdWebhook(partner, raw, request.headers);
		return json({ ok: status < 300 }, { status });
	});
};
