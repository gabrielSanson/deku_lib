import { createServerClient } from '@supabase/ssr';
import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { randomUUID } from 'node:crypto';
import { loadStaff } from '#lib/server/auth/staff.ts';
import { config } from '#lib/server/config.ts';

const STAFF_PREFIXES = ['/staff', '/kitchen'];

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.requestId = event.request.headers.get('x-request-id') ?? randomUUID();
	event.locals.staff = null;
	event.locals.supabase = null;

	const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } = config();
	const path = event.url.pathname;
	const needsSession = STAFF_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));

	if (needsSession && PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY) {
		const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookies) => {
					for (const { name, value, options } of cookies) {
						event.cookies.set(name, value, { ...options, path: '/' });
					}
				}
			}
		});
		event.locals.supabase = supabase;
		// getClaims verifies the JWT signature; never trust an unverified session cookie.
		const { data } = await supabase.auth.getClaims();
		const claims = data?.claims;
		if (claims?.sub) {
			event.locals.staff = await loadStaff(claims.sub, (claims.email as string | undefined) ?? null);
		}
	}

	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version'
	});
	response.headers.set('x-request-id', event.locals.requestId);
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
	if (needsSession) {
		response.headers.set('x-frame-options', 'DENY');
		response.headers.set('cache-control', 'no-store');
	}
	return response;
};

export const handleError: HandleServerError = (caught) => {
	// App and framework errors keep their own status/message (e.g. 403, 404).
	if (caught.kind !== 'unknown') return;
	const requestId = caught.event.locals.requestId;
	console.error(
		JSON.stringify({ level: 'error', requestId, path: caught.event.url.pathname, err: String(caught.error) })
	);
	return { message: 'Erro inesperado. Tente novamente.', code: requestId };
};
