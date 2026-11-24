import { PERMISSIONS } from '#lib/domain/permissions.ts';
import { mfaApplies, mfaGate } from '#lib/domain/mfa.ts';
import { adminMfaRequired, hasVerifiedFactor } from '#lib/server/auth/mfa.ts';
import { createServerClient } from '@supabase/ssr';
import { error, redirect } from '@sveltejs/kit';
import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { randomUUID } from 'node:crypto';
import { loadCustomer } from '#lib/server/auth/customer.ts';
import { loadStaff } from '#lib/server/auth/staff.ts';
import { config, supabaseServerUrl } from '#lib/server/config.ts';
import { DEFAULT_SHOP_ID, withShop } from '#lib/server/db.ts';
import { resolveShop, syncTenancy } from '#lib/server/platform/shops.ts';
import { loadPlatformAdmin } from '#lib/server/platform/admins.ts';
import { PLATFORM_VIEW_COOKIE, readViewToken } from '#lib/server/platform/console.ts';
import { audit } from '#lib/server/audit.ts';
import { recordError } from '#lib/server/monitoring/errors.ts';
import { db } from '#lib/server/db.ts';
import { adminMode } from '#lib/server/presets/index.ts';
import { pathAllowed } from '#lib/staff/admin-mode.ts';
import { isPlatformPath, isStaffPath, sessionCookieName } from '#lib/supabase-cookie.ts';

// Assets and health checks never need the sign-in state.
const NO_SHOP = '00000000-0000-0000-0000-000000000000';
const NO_SESSION = /^\/(api|media|health|offline)(\/|$)|\.webmanifest$/;
// The platform's own pages, on the platform domain (multi-shop installs).
const PLATFORM_PAGES =
	/^\/(conheca|criar-loja|termos|privacidade-plataforma|dpa|plataforma|staff\/lojas|api\/v1\/tls-ask|health)(\/|$)/;
// A suspended shop can still sign in, look around and pay its invoice.
const SUSPENDED_ALLOWED = /^\/staff\/(login|logout|lojas|settings\/plano)(\/|$)/;

export const handle: Handle = async ({ event, resolve }) => {
	await syncTenancy();
	event.locals.shop = await resolveShop(event.url.host);
	const path = event.url.pathname;
	if (!event.locals.shop && config().TENANCY === 'multi') {
		// The platform's own domain: its landing page, sign-up, legal pages and console only.
		if (path === '/') redirect(307, '/conheca');
		if (!PLATFORM_PAGES.test(path) && !/\.(css|js|png|svg|ico|webmanifest|woff2?)$/.test(path)) {
			error(404, 'Página não encontrada.');
		}
	}
	if (
		event.locals.shop?.status === 'suspended' &&
		event.request.method !== 'GET' &&
		!SUSPENDED_ALLOWED.test(path)
	) {
		error(403, 'Esta loja está suspensa. Regularize o plano em Configurações → Plano e cobrança.');
	}
	// Every database call while handling this request is limited to its shop.
	// The platform's own pages (no shop) see no shop's rows at all.
	const shopId =
		event.locals.shop?.id ?? (config().TENANCY === 'multi' ? NO_SHOP : DEFAULT_SHOP_ID);
	return withShop(shopId, async () => handleForShop({ event, resolve }));
};

const handleForShop: Handle = async ({ event, resolve }) => {
	event.locals.requestId = event.request.headers.get('x-request-id') ?? randomUUID();
	event.locals.staff = null;
	event.locals.supabase = null;
	event.locals.customer = null;
	event.locals.authUserId = null;
	event.locals.platformAdmin = null;
	event.locals.platformView = null;

	const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } = config();
	const path = event.url.pathname;
	// The simple staff area (ADMIN_MODE / the cookie preset) switches the back office off.
	if (!pathAllowed(adminMode(), path)) {
		// The order payment screen returns to the till; a simple shop goes back to its orders.
		if (path === '/staff/pos') redirect(303, '/staff/orders');
		error(404, 'Página não encontrada.');
	}
	const isStaff = isStaffPath(path);
	// Shop pages read the customer's sign-in too (the account button, /conta).
	const withSession = !NO_SESSION.test(path);
	let aal: string | null = null;

	if (withSession && PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY) {
		const supabase = createServerClient(
			supabaseServerUrl() ?? PUBLIC_SUPABASE_URL,
			PUBLIC_SUPABASE_ANON_KEY,
			{
				cookieOptions: { name: sessionCookieName(path) },
				cookies: {
					getAll: () => event.cookies.getAll(),
					setAll: (cookies) => {
						for (const { name, value, options } of cookies) {
							event.cookies.set(name, value, { ...options, path: '/' });
						}
					}
				}
			}
		);
		event.locals.supabase = supabase;
		// getClaims verifies the JWT signature; never trust an unverified session cookie.
		const { data } = await supabase.auth.getClaims();
		const claims = data?.claims;
		aal = typeof claims?.aal === 'string' ? claims.aal : null;
		if (claims?.sub) {
			event.locals.authUserId = claims.sub;
			if (isPlatformPath(path)) {
				event.locals.platformAdmin = await loadPlatformAdmin(
					claims.sub,
					(claims.email as string | undefined) ?? null
				);
			} else if (isStaff) {
				event.locals.staff = await loadStaff(
					claims.sub,
					(claims.email as string | undefined) ?? null
				);
			} else {
				event.locals.customer = await loadCustomer(claims.sub);
			}
		}
	}

	// "Ver como a loja": a platform admin looking at this shop's staff screens, read-only.
	const viewCookie =
		isStaff && !event.locals.staff ? event.cookies.get(PLATFORM_VIEW_COOKIE) : undefined;
	if (viewCookie && event.locals.shop) {
		const adminId = readViewToken(viewCookie, event.locals.shop.id);
		if (adminId) {
			event.locals.platformView = adminId;
			event.locals.staff = {
				id: adminId,
				displayName: 'Plataforma (somente leitura)',
				role: 'admin',
				email: null,
				permissions: [...PERMISSIONS]
			};
			if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
				error(403, 'Visualização da plataforma: somente leitura.');
			}
			await audit(db(), { type: 'platform', id: adminId }, 'platform.view', 'page', null, {
				path
			});
		}
	}

	// Two-step sign-in for the people who manage the shop (S5.9).
	const staff = event.locals.staff;
	if (staff && !event.locals.platformView && mfaApplies(staff.permissions)) {
		const [hasFactor, required] = await Promise.all([
			hasVerifiedFactor(staff.id),
			adminMfaRequired()
		]);
		const gate = mfaGate({ path, permissions: staff.permissions, aal, hasFactor, required });
		if (gate !== 'ok') {
			const next = encodeURIComponent(path + event.url.search);
			redirect(
				303,
				gate === 'verify' ? `/staff/seguranca/verificar?next=${next}` : '/staff/seguranca'
			);
		}
	}

	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
	response.headers.set('x-request-id', event.locals.requestId);
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
	if (isStaff) {
		// Tickets are printed from a hidden frame on the kitchen screen; nothing else may be framed.
		response.headers.set(
			'x-frame-options',
			path.startsWith('/staff/print/') ? 'SAMEORIGIN' : 'DENY'
		);
		response.headers.set('cache-control', 'no-store');
	}
	return response;
};

export const handleError: HandleServerError = (caught) => {
	// App and framework errors keep their own status/message (e.g. 403, 404).
	if (caught.kind !== 'unknown') return;
	const requestId = caught.event.locals.requestId;
	const err = caught.error;
	const locals = caught.event.locals;
	void recordError({
		where: 'web',
		message: err instanceof Error ? err.message : String(err),
		stack: err instanceof Error ? (err.stack ?? null) : null,
		route: caught.event.route.id ?? caught.event.url.pathname,
		requestId,
		userKind: locals.platformAdmin
			? 'platform'
			: locals.staff
				? 'staff'
				: locals.customer
					? 'customer'
					: 'anonymous',
		shopId: locals.shop?.id ?? null
	});
	console.error(
		JSON.stringify({
			level: 'error',
			requestId,
			path: caught.event.url.pathname,
			err: String(caught.error)
		})
	);
	return { message: 'Erro inesperado. Tente novamente.', code: requestId };
};
