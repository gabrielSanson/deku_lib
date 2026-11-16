// Linking a shop's iFood store to the platform's single iFood app ("aplicativo distribuído").
// The shop asks for a user code, enters it in the iFood Portal do Parceiro, gets back an
// authorization code and pastes it here; we trade it for a refresh token kept per shop.
//
// TODO(verify): every path, field name and lifetime below follows our reading of iFood's
// distributed-app docs, which could not be loaded on 2026-11-15. Check them in homologation.
import { config } from '../../config';
import { IfoodApiError } from './api';

export const IFOOD_AUTH_PATHS = {
	userCode: '/authentication/v1.0/oauth/userCode', // TODO(verify)
	token: '/authentication/v1.0/oauth/token' // TODO(verify): grantType authorization_code / refresh_token
} as const;

export interface UserCode {
	userCode: string;
	verificationUrl: string;
	verifier: string;
	expiresInSeconds: number;
}

export interface LinkTokens {
	accessToken: string;
	refreshToken: string;
	expiresInSeconds: number;
}

export interface IfoodAppAuth {
	requestUserCode(): Promise<UserCode>;
	exchangeAuthorizationCode(authorizationCode: string, verifier: string): Promise<LinkTokens>;
	refresh(refreshToken: string): Promise<LinkTokens>;
}

type Fetch = typeof fetch;

async function post(f: Fetch, path: string, form: Record<string, string>) {
	const res = await f(config().IFOOD_API_BASE + path, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams(form),
		signal: AbortSignal.timeout(10_000)
	});
	const text = await res.text();
	if (!res.ok) throw new IfoodApiError(`iFood ${path} failed`, res.status, text);
	return JSON.parse(text) as Record<string, unknown>;
}

function tokens(body: Record<string, unknown>): LinkTokens {
	return {
		accessToken: String(body.accessToken ?? ''),
		refreshToken: String(body.refreshToken ?? ''),
		expiresInSeconds: Number(body.expiresIn ?? 3600)
	};
}

export function ifoodAppAuth(f: Fetch = fetch): IfoodAppAuth {
	const app = () => {
		const { IFOOD_APP_CLIENT_ID: id, IFOOD_APP_CLIENT_SECRET: secret } = config();
		if (!id || !secret)
			throw new Error('IFOOD_APP_CLIENT_ID and IFOOD_APP_CLIENT_SECRET are not set');
		return { id, secret };
	};
	return {
		async requestUserCode() {
			const body = await post(f, IFOOD_AUTH_PATHS.userCode, { clientId: app().id });
			return {
				userCode: String(body.userCode ?? ''),
				verificationUrl: String(body.verificationUrlComplete ?? body.verificationUrl ?? ''),
				verifier: String(body.authorizationCodeVerifier ?? ''),
				expiresInSeconds: Number(body.expiresIn ?? 600)
			};
		},
		async exchangeAuthorizationCode(authorizationCode, verifier) {
			const { id, secret } = app();
			return tokens(
				await post(f, IFOOD_AUTH_PATHS.token, {
					grantType: 'authorization_code',
					clientId: id,
					clientSecret: secret,
					authorizationCode,
					authorizationCodeVerifier: verifier
				})
			);
		},
		async refresh(refreshToken) {
			const { id, secret } = app();
			return tokens(
				await post(f, IFOOD_AUTH_PATHS.token, {
					grantType: 'refresh_token',
					clientId: id,
					clientSecret: secret,
					refreshToken
				})
			);
		}
	};
}

/** Local stand-in: any authorization code that starts with "ok" links. Refused in production. */
export const stubAppAuth: IfoodAppAuth = {
	async requestUserCode() {
		return {
			userCode: 'TEST-1234',
			verificationUrl: 'https://portal.ifood.com.br/apps/code?c=TEST-1234',
			verifier: 'stub-verifier',
			expiresInSeconds: 600
		};
	},
	async exchangeAuthorizationCode(code, verifier) {
		if (!code.startsWith('ok') || verifier !== 'stub-verifier')
			throw new IfoodApiError('invalid authorization code', 400, '{"error":"invalid_grant"}');
		return {
			accessToken: 'stub-access',
			refreshToken: `stub-refresh-${code}`,
			expiresInSeconds: 3600
		};
	},
	async refresh(refreshToken) {
		return { accessToken: 'stub-access', refreshToken, expiresInSeconds: 3600 };
	}
};

/** Whether this install offers "Conectar com iFood". */
export function ifoodAppAvailable() {
	const c = config();
	return c.IFOOD_APP_STUB || Boolean(c.IFOOD_APP_CLIENT_ID && c.IFOOD_APP_CLIENT_SECRET);
}

export function appAuth(): IfoodAppAuth {
	return config().IFOOD_APP_STUB ? stubAppAuth : ifoodAppAuth();
}
