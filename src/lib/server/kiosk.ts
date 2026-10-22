// The in-store totem is the normal shop in kiosk mode: opening /totem once on
// the totem's browser sets this cookie, and the shop then hides delivery,
// accounts and order history, offers "Pagar no caixa", and starts over by itself.
import type { Cookies } from '@sveltejs/kit';

export const KIOSK_COOKIE = 'deku-totem';

export function isKiosk(cookies: Cookies): boolean {
	return cookies.get(KIOSK_COOKIE) === '1';
}
