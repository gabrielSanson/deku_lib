// iFood Merchant API client.
//
// UNVERIFIED: paths, payload shapes and the webhook signature scheme follow
// iFood's public developer docs as we understood them, but have not been
// exercised against iFood's homologation environment. IFOOD_ENABLED stays
// false until that homologation passes; keep every iFood URL in IFOOD_PATHS
// so corrections land in one place.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../../config';

export const IFOOD_PATHS = {
	token: '/authentication/v1.0/oauth/token',
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

let token: { value: string; expiresAt: number } | undefined;

export function resetIfoodTokenForTests() {
	token = undefined;
}

function credentials() {
	const c = config();
	if (!c.IFOOD_CLIENT_ID || !c.IFOOD_CLIENT_SECRET || !c.IFOOD_MERCHANT_ID) {
		throw new Error(
			'iFood credentials are not configured (IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET, IFOOD_MERCHANT_ID)'
		);
	}
	return {
		base: c.IFOOD_API_BASE,
		clientId: c.IFOOD_CLIENT_ID,
		clientSecret: c.IFOOD_CLIENT_SECRET,
		merchantId: c.IFOOD_MERCHANT_ID
	};
}

async function accessToken(f: Fetch): Promise<string> {
	if (token && token.expiresAt > Date.now() + 60_000) return token.value;
	const { base, clientId, clientSecret } = credentials();
	const res = await f(base + IFOOD_PATHS.token, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ grantType: 'client_credentials', clientId, clientSecret }),
		signal: AbortSignal.timeout(10_000)
	});
	const text = await res.text();
	if (!res.ok) throw new IfoodApiError('iFood token request failed', res.status, text);
	const body = JSON.parse(text) as { accessToken: string; expiresIn: number };
	token = { value: body.accessToken, expiresAt: Date.now() + body.expiresIn * 1000 };
	return token.value;
}

async function call(
	f: Fetch,
	path: string,
	init: RequestInit = {}
): Promise<{ status: number; body: string }> {
	const { base } = credentials();
	const send = async () =>
		f(base + path, {
			...init,
			headers: {
				...(init.headers as Record<string, string>),
				authorization: `Bearer ${await accessToken(f)}`
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

export function ifoodClient(f: Fetch = fetch) {
	return {
		async poll(): Promise<IfoodEvent[]> {
			const res = await call(f, IFOOD_PATHS.polling, {
				headers: { 'x-polling-merchants': credentials().merchantId }
			});
			return res.status === 204 || !res.body ? [] : (JSON.parse(res.body) as IfoodEvent[]);
		},
		async acknowledge(ids: string[]) {
			if (!ids.length) return;
			await call(f, IFOOD_PATHS.acknowledgment, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(ids.map((id) => ({ id })))
			});
		},
		async order(id: string): Promise<unknown> {
			return JSON.parse((await call(f, IFOOD_PATHS.order(id))).body);
		},
		async action(path: string, body?: unknown) {
			await call(f, path, {
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
	secret = config().IFOOD_CLIENT_SECRET
) {
	if (!signature || !secret) return false;
	const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
	const given = signature.trim().toLowerCase();
	return (
		given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
	);
}
