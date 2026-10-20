// iFood webhook receiver. Disabled (404) unless IFOOD_ENABLED is on.
import { json } from '@sveltejs/kit';
import { receiveIfoodWebhook } from '#lib/server/integrations/ifood/service.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const raw = new Uint8Array(await request.arrayBuffer());
	const { status } = await receiveIfoodWebhook(raw, request.headers);
	return json({ ok: status < 300 }, { status });
};
