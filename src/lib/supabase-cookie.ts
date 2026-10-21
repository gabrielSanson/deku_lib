// Staff and customers sign in with separate Supabase sessions, each in its own cookie,
// so signing in on one side does not sign the other out on the same browser.
// The name is picked by path: staff areas use the staff cookie, everything else the
// customer cookie. Fixed names keep the server and the browser in step, even when
// the server uses a private gateway URL.
export const STAFF_PREFIXES = ['/staff', '/kitchen'];
const STAFF_COOKIE = 'sb-shop-auth';
const CUSTOMER_COOKIE = 'sb-customer-auth';

export function isStaffPath(path: string) {
	return STAFF_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
}

export function sessionCookieName(path: string) {
	return isStaffPath(path) ? STAFF_COOKIE : CUSTOMER_COOKIE;
}
