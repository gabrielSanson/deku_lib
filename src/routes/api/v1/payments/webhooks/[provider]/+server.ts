import { clientKey, rateLimit } from '#lib/server/rate-limit.ts';
import { receivePaymentWebhook } from '#lib/server/payments/online.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const { params, request, url } = event;
	if (!rateLimit(`pay-webhook:${clientKey(event)}`, 300, 60_000))
		return new Response(null, { status: 429 });
	// Signature checks need the exact bytes the provider signed.
	const raw = new Uint8Array(await request.arrayBuffer());
	const { status } = await receivePaymentWebhook(params.provider, raw, request.headers, url);
	return new Response(null, { status });
};
