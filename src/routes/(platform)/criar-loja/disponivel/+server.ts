// Live check of a shop address while the owner types it.
import { json } from '@sveltejs/kit';
import { slugProblem } from '#lib/domain/signup.ts';
import { slugAvailable } from '#lib/server/platform/signup.ts';
import { clientKey, rateLimit } from '#lib/server/rate-limit.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	if (!rateLimit(`slug-check:${clientKey(event)}`, 60, 60_000))
		return json({ ok: false }, { status: 429 });
	const slug = (event.url.searchParams.get('slug') ?? '').toLowerCase();
	const problem = slugProblem(slug);
	if (problem) return json({ ok: false, problem });
	return json({ ok: await slugAvailable(slug), problem: null });
};
