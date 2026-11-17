// Error tracking (S5.11): browsers report unhandled errors here. Rate-limited per address; the
// body is trimmed and never echoed back.
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { recordError } from '#lib/server/monitoring/errors.ts';
import { clientKey, rateLimit } from '#lib/server/rate-limit.ts';
import type { RequestHandler } from './$types';

const report = z.object({
	message: z.string().min(1).max(1000),
	stack: z.string().max(8000).optional(),
	url: z.string().max(500).optional()
});

export const POST: RequestHandler = async (event) => {
	if (!rateLimit(`client-errors:${clientKey(event)}`, 20, 10 * 60_000))
		return json({ ok: false }, { status: 429 });
	const parsed = report.safeParse(await event.request.json().catch(() => null));
	if (!parsed.success) return json({ ok: false }, { status: 400 });
	const route = URL.canParse(parsed.data.url ?? '') ? new URL(parsed.data.url!).pathname : null;
	const l = event.locals;
	await recordError({
		where: 'client',
		message: parsed.data.message,
		stack: parsed.data.stack ?? null,
		route,
		requestId: l.requestId,
		userKind: l.staff ? 'staff' : l.customer ? 'customer' : 'anonymous',
		shopId: l.shop?.id ?? null
	});
	return json({ ok: true });
};
