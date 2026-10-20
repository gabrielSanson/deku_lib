import { rateLimit } from '#lib/server/rate-limit.ts';
import { receivePaymentWebhook } from '#lib/server/payments/online.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, getClientAddress }) => {
	if (!rateLimit(`pay-webhook:${getClientAddress()}`, 300, 60_000)) return new Response(null, { status: 429 });
	// Signature checks need the exact bytes the provider signed.
	const raw = new Uint8Array(await request.arrayBuffer());
	const { status } = await receivePaymentWebhook(params.provider, raw, request.headers);
	return new Response(null, { status });
};
