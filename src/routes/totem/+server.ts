import { redirect } from '@sveltejs/kit';
import { KIOSK_COOKIE } from '#lib/server/kiosk.ts';
import type { RequestHandler } from './$types';

/** /totem turns this browser into the shop's totem; /totem?sair turns it back. */
export const GET: RequestHandler = ({ cookies, url }) => {
	if (url.searchParams.has('sair')) {
		cookies.delete(KIOSK_COOKIE, { path: '/' });
		redirect(303, '/');
	}
	// A year, so the totem stays a totem after the PC restarts.
	cookies.set(KIOSK_COOKIE, '1', {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365
	});
	redirect(303, '/cardapio');
};
