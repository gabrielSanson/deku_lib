// Open Delivery client: OAuth2 client credentials, event polling and acknowledgment, order
// details and the order actions. TODO(verify): paths follow the published Open Delivery spec
// (OD_SPEC_VERSION); each partner may host them under its own base URL.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { currentShopId } from '../../db';
import type { OdAction, OdPartner } from './mapping';
import { odCredentials } from './settings';

export const OD_PATHS = {
	token: '/oauth/token',
	merchant: (id: string) => `/v1/merchants/${encodeURIComponent(id)}`,
	polling: '/v1/events:polling',
	acknowledgment: '/v1/events/acknowledgment',
	order: (id: string) => `/v1/orders/${encodeURIComponent(id)}`,
	action: (id: string, action: OdAction) => `/v1/orders/${encodeURIComponent(id)}/${action}`
} as const;

export class OdApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly body: string
	) {
		super(message);
	}
}

export interface OdEvent {
	eventId: string;
	eventType: string;
	orderId: string;
	orderURL?: string;
	createdAt?: string;
	sourceAppId?: string;
}

export interface OdCredentials {
	baseUrl: string;
	clientId: string;
	clientSecret: string;
	merchantId: string;
}

type Fetch = typeof fetch;
const tokens = new Map<string, { value: string; expiresAt: number }>();

export function odClient(
	partner: OdPartner,
	f: Fetch = fetch,
	creds: () => Promise<OdCredentials | null> = () => odCredentials(partner)
) {
	const need = async () => {
		const c = await creds();
		if (!c) throw new OdApiError('Open Delivery credentials are not configured', 0, '');
		return c;
	};
	const token = async (c: OdCredentials) => {
		const key = `${currentShopId()}|${partner}|${c.baseUrl}|${c.clientId}`;
		const cached = tokens.get(key);
		if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;
		const res = await f(c.baseUrl + OD_PATHS.token, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				grant_type: 'client_credentials',
				client_id: c.clientId,
				client_secret: c.clientSecret
			}),
			signal: AbortSignal.timeout(10_000)
		});
		const text = await res.text();
		if (!res.ok) throw new OdApiError('Open Delivery token request failed', res.status, text);
		const body = JSON.parse(text) as { access_token: string; expires_in?: number };
		tokens.set(key, {
			value: body.access_token,
			expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000
		});
		return body.access_token;
	};
	const call = async (path: string, init: RequestInit = {}) => {
		const c = await need();
		const res = await f(c.baseUrl + path, {
			...init,
			headers: {
				...(init.headers as Record<string, string>),
				authorization: `Bearer ${await token(c)}`,
				'x-polling-merchants': c.merchantId
			},
			signal: AbortSignal.timeout(10_000)
		});
		const body = await res.text();
		if (!res.ok && res.status !== 204)
			throw new OdApiError(
				`Open Delivery ${init.method ?? 'GET'} ${path} failed`,
				res.status,
				body
			);
		return { status: res.status, body };
	};
	return {
		async authenticate() {
			const c = await need();
			tokens.clear();
			await token(c);
		},
		async merchant() {
			const c = await need();
			return JSON.parse((await call(OD_PATHS.merchant(c.merchantId))).body || 'null');
		},
		async poll(): Promise<OdEvent[]> {
			const r = await call(OD_PATHS.polling);
			return r.status === 204 || !r.body ? [] : (JSON.parse(r.body) as OdEvent[]);
		},
		async acknowledge(ids: string[]) {
			if (!ids.length) return;
			await call(OD_PATHS.acknowledgment, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(ids.map((id) => ({ id })))
			});
		},
		async order(id: string): Promise<unknown> {
			return JSON.parse((await call(OD_PATHS.order(id))).body);
		},
		async action(id: string, action: OdAction, body?: unknown): Promise<unknown> {
			return call(OD_PATHS.action(id, action), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body ?? {})
			});
		}
	};
}
export type OdClient = ReturnType<typeof odClient>;

/** Webhook signature: HMAC-SHA256 of the raw body with the client secret, hex. TODO(verify). */
export function verifyOdSignature(
	raw: Uint8Array,
	signature: string | null,
	secret: string | null
) {
	if (!signature || !secret) return false;
	const expected = createHmac('sha256', secret).update(raw).digest('hex');
	const given = signature.trim().toLowerCase();
	return (
		given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
	);
}
