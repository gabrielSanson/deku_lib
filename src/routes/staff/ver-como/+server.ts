// Opens this shop's staff screens read-only for a platform admin, from a signed link the
// console makes. The link's token becomes a short-lived cookie checked on every staff request.
import { error, redirect } from '@sveltejs/kit';
import { PLATFORM_VIEW_COOKIE, readViewToken, VIEW_TTL_MS } from '#lib/server/platform/console.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	const token = url.searchParams.get('t') ?? '';
	if (!locals.shop || !readViewToken(token, locals.shop.id)) {
		error(403, 'Link de visualização inválido ou expirado.');
	}
	cookies.set(PLATFORM_VIEW_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: VIEW_TTL_MS / 1000
	});
	redirect(303, '/staff');
};
