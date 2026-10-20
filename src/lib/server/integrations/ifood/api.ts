// iFood Merchant API client.
//
// UNVERIFIED: paths, payload shapes and the webhook signature scheme follow
// iFood's public developer docs as we understood them, but have not been
// exercised against iFood's homologation environment. Keep every iFood URL in
// IFOOD_PATHS so corrections land in one place.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ifoodSettings } from './settings';

export const IFOOD_PATHS = {
	token: '/authentication/v1.0/oauth/token',
	merchant: (id: string) => `/merchant/v1.0/merchants/${encodeURIComponent(id)}`,
	polling: '/events/v1.0/events:polling',
	acknowledgment: '/events/v1.0/events/acknowledgment',
	order: (id: string) => `/order/v1.0/orders/${encodeURIComponent(id)}`,
	confirm: (id: string) => `/order/v1.0/orders/${encodeURIComponent(id)}/confirm`,
	startPreparation: (id: string) => `/order/v1.0/orders/${encodeURIComponent(id)}/startPreparation`,
	readyToPickup: (id: string) => `/order/v1.0/orders/${encodeURIComponent(id)}/readyToPickup`,
	dispatch: (id: string) => `/order/v1.0/orders/${encodeURIComponent(id)}/dispatch`,
	requestCancellation: (id: string) =>
		`/order/v1.0/orders/${encodeURIComponent(id)}/requestCancellation`
} as const;

export class IfoodApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly body: string
	) {
		super(message);
	}
}

export interface IfoodEvent {
	id: string;
	code: string;
	fullCode?: string;
	orderId: string;
	merchantId?: string;
	createdAt?: string;
	metadata?: Record<string, unknown>;
}

type Fetch = typeof fetch;

export interface IfoodCredentials {
	base: string;
	clientId: string;
	clientSecret: string;
	merchantId: string;
}

export class IfoodNotConfiguredError extends Error {}

let token: { key: string; value: string; expiresAt: number } | undefined;

export function resetIfoodTokenForTests() {
	token = undefined;
}

/** Credentials saved in the setup wizard, or the IFOOD_* environment variables. */
export async function currentIfoodCredentials(): Promise<IfoodCredentials> {
	const s = await ifoodSettings();
	if (!s.clientId || !s.clientSecret || !s.merchantId) {
		throw new IfoodNotConfiguredError('iFood credentials are not configured');
	}
	return {
		base: s.apiBase,
		clientId: s.clientId,
		clientSecret: s.clientSecret,
		merchantId: s.merchantId
	};
}

async function accessToken(f: Fetch, c: IfoodCredentials): Promise<string> {
	const key = `${c.base}|${c.clientId}|${c.clientSecret.length}`;
	if (token && token.key === key && token.expiresAt > Date.now() + 60_000) return token.value;
	const res = await f(c.base + IFOOD_PATHS.token, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grantType: 'client_credentials',
			clientId: c.clientId,
			clientSecret: c.clientSecret
		}),
		signal: AbortSignal.timeout(10_000)
	});
	const text = await res.text();
	if (!res.ok) throw new IfoodApiError('iFood token request failed', res.status, text);
	const body = JSON.parse(text) as { accessToken: string; expiresIn: number };
	token = { key, value: body.accessToken, expiresAt: Date.now() + body.expiresIn * 1000 };
	return token.value;
}

async function call(
	f: Fetch,
	c: IfoodCredentials,
	path: string,
	init: RequestInit = {}
): Promise<{ status: number; body: string }> {
	const send = async () =>
		f(c.base + path, {
			...init,
			headers: {
				...(init.headers as Record<string, string>),
				authorization: `Bearer ${await accessToken(f, c)}`
			},
			signal: AbortSignal.timeout(10_000)
		});
	let res = await send();
	if (res.status === 401) {
		token = undefined;
		res = await send();
	}
	const body = await res.text();
	if (!res.ok && res.status !== 204)
		throw new IfoodApiError(`iFood ${init.method ?? 'GET'} ${path} failed`, res.status, body);
	return { status: res.status, body };
}

export function ifoodClient(
	f: Fetch = fetch,
	creds: () => Promise<IfoodCredentials> = currentIfoodCredentials
) {
	return {
		/** Fetches a fresh token: proves the client id and secret are accepted. */
		async authenticate() {
			token = undefined;
			await accessToken(f, await creds());
		},
		/** Reads the merchant: proves the credentials can see this store. */
		async merchant(): Promise<unknown> {
			const c = await creds();
			return JSON.parse((await call(f, c, IFOOD_PATHS.merchant(c.merchantId))).body || 'null');
		},
		async poll(): Promise<IfoodEvent[]> {
			const c = await creds();
			const res = await call(f, c, IFOOD_PATHS.polling, {
				headers: { 'x-polling-merchants': c.merchantId }
			});
			return res.status === 204 || !res.body ? [] : (JSON.parse(res.body) as IfoodEvent[]);
		},
		async acknowledge(ids: string[]) {
			if (!ids.length) return;
			await call(f, await creds(), IFOOD_PATHS.acknowledgment, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(ids.map((id) => ({ id })))
			});
		},
		async order(id: string): Promise<unknown> {
			return JSON.parse((await call(f, await creds(), IFOOD_PATHS.order(id))).body);
		},
		async action(path: string, body?: unknown) {
			await call(f, await creds(), path, {
				method: 'POST',
				headers: body ? { 'content-type': 'application/json' } : {},
				body: body ? JSON.stringify(body) : undefined
			});
		}
	};
}

export type IfoodClient = ReturnType<typeof ifoodClient>;

/** HMAC-SHA256 of the raw body with the client secret, hex encoded (UNVERIFIED scheme). */
export function verifyIfoodSignature(
	rawBody: Uint8Array,
	signature: string | null,
	secret: string | null | undefined
) {
	if (!signature || !secret) return false;
	const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
	const given = signature.trim().toLowerCase();
	return (
		given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
	);
}
