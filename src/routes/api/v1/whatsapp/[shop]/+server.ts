// WhatsApp Cloud API webhook for one shop: GET is Meta's subscription check, POST carries
// customer messages (signed with the app secret).
import { json, text } from '@sveltejs/kit';
import { forShopInPath } from '#lib/server/platform/webhooks.ts';
import { receiveWhatsappWebhook, whatsappChallenge } from '#lib/server/whatsapp/service.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) =>
	forShopInPath(params.shop, async () => {
		const challenge = await whatsappChallenge(url.searchParams);
		return challenge === null ? new Response(null, { status: 403 }) : text(challenge);
	});

export const POST: RequestHandler = async ({ params, request }) =>
	forShopInPath(params.shop, async () => {
		const raw = new Uint8Array(await request.arrayBuffer());
		const { status } = await receiveWhatsappWebhook(raw, request.headers);
		return json({ ok: status < 300 }, { status });
	});
