// Where the iFood connection comes from: what the owner saved in the setup
// wizard (secret encrypted), or else the IFOOD_* environment variables.
// The worker re-reads this every few seconds, so turning iFood on or off in the
// app takes effect without a restart.
import { audit, type Actor } from '../../audit';
import { config } from '../../config';
import { currentShopId, db, DEFAULT_SHOP_ID, type Db } from '../../db';
import { DomainError } from '../../errors';
import { decryptSecret, encryptSecret } from '../../secrets';
import { getShopSecret } from '../../platform/secrets';
import { perShop } from '../../shop-cache';

export interface IfoodSettings {
	/** app: keys typed in Configurações; link: store linked to the platform's iFood app. */
	source: 'app' | 'link' | 'env' | 'none';
	authMode: 'own' | 'app';
	refreshToken: string | null;
	homologation: boolean;
	enabled: boolean;
	clientId: string | null;
	clientSecret: string | null;
	merchantId: string | null;
	apiBase: string;
	/** Set when a saved secret can no longer be decrypted (APP_SECRET changed). */
	problem: string | null;
}

interface Row {
	enabled: boolean;
	client_id: string | null;
	client_secret_enc: string | null;
	merchant_id: string | null;
	last_check_at: Date | null;
	last_check_ok: boolean | null;
	last_check_error: string | null;
	last_poll_ok_at: Date | null;
	last_poll_error_at: Date | null;
	last_poll_error: string | null;
	updated_at: Date;
	auth_mode: 'own' | 'app';
	link_user_code: string | null;
	link_verifier: string | null;
	link_expires_at: Date | null;
	linked_at: Date | null;
	homologation: boolean;
}

const TTL_MS = 5_000;
const cache = perShop<{ value: IfoodSettings; at: number }>();

export function invalidateIfoodSettings() {
	cache.value = undefined;
}

export async function ifoodSettingsRow(sql: Db = db()): Promise<Row> {
	const [r] = await sql<Row[]>`select * from ifood_settings where shop_id = current_shop_id()`;
	return r;
}

export async function ifoodSettings({ fresh = false } = {}): Promise<IfoodSettings> {
	if (!fresh && cache.value && Date.now() - cache.value.at < TTL_MS) return cache.value.value;
	const c = config();
	const r = await ifoodSettingsRow();
	let value: IfoodSettings;
	const base = { authMode: r.auth_mode, refreshToken: null, homologation: r.homologation };
	if (r.auth_mode === 'app') {
		const refreshToken = await getShopSecret('ifood_refresh');
		const linkedApp =
			Boolean(c.IFOOD_APP_CLIENT_ID && c.IFOOD_APP_CLIENT_SECRET) || c.IFOOD_APP_STUB;
		value = {
			...base,
			source: 'link',
			refreshToken,
			enabled: r.enabled && Boolean(refreshToken) && linkedApp,
			clientId: c.IFOOD_APP_CLIENT_ID ?? (c.IFOOD_APP_STUB ? 'stub-app' : null),
			clientSecret: c.IFOOD_APP_CLIENT_SECRET ?? (c.IFOOD_APP_STUB ? 'stub-app-secret' : null),
			merchantId: r.merchant_id,
			apiBase: c.IFOOD_API_BASE,
			problem: linkedApp
				? null
				: 'A loja está ligada ao aplicativo iFood da plataforma, mas o servidor não tem IFOOD_APP_CLIENT_ID e IFOOD_APP_CLIENT_SECRET.'
		};
	} else if (r.client_id && r.client_secret_enc) {
		let secret: string | null = null;
		let problem: string | null = null;
		try {
			secret = decryptSecret(r.client_secret_enc);
		} catch {
			problem =
				'O Client Secret salvo não pode ser lido (o APP_SECRET do servidor mudou). Digite o Client Secret de novo.';
		}
		value = {
			...base,
			source: 'app',
			enabled: r.enabled && !problem,
			clientId: r.client_id,
			clientSecret: secret,
			merchantId: r.merchant_id,
			apiBase: c.IFOOD_API_BASE,
			problem
		};
	} else if (c.IFOOD_CLIENT_ID && currentShopId() === DEFAULT_SHOP_ID) {
		// .env credentials only ever belong to a single-shop install's own shop.
		value = {
			...base,
			source: 'env',
			enabled: c.IFOOD_ENABLED,
			clientId: c.IFOOD_CLIENT_ID,
			clientSecret: c.IFOOD_CLIENT_SECRET ?? null,
			merchantId: c.IFOOD_MERCHANT_ID ?? null,
			apiBase: c.IFOOD_API_BASE,
			problem: null
		};
	} else {
		value = {
			...base,
			source: 'none',
			enabled: c.IFOOD_ENABLED && currentShopId() === DEFAULT_SHOP_ID,
			clientId: null,
			clientSecret: null,
			merchantId: null,
			apiBase: c.IFOOD_API_BASE,
			problem: null
		};
	}
	cache.value = { value, at: Date.now() };
	return value;
}

/** What the setup and integration screens show. Never includes the secret. */
export async function ifoodStatus() {
	const [s, r] = await Promise.all([ifoodSettings({ fresh: true }), ifoodSettingsRow()]);
	return {
		source: s.source,
		enabled: s.enabled,
		clientId: s.clientId,
		merchantId: s.merchantId,
		hasSecret: Boolean(s.clientSecret),
		authMode: s.authMode,
		linked: s.authMode === 'app' && Boolean(s.refreshToken),
		linkedAt: r.linked_at,
		linkUserCode: r.link_expires_at && r.link_expires_at > new Date() ? r.link_user_code : null,
		linkExpiresAt: r.link_expires_at,
		homologation: s.homologation,
		problem: s.problem,
		lastCheckAt: r.last_check_at,
		lastCheckOk: r.last_check_ok,
		lastCheckError: r.last_check_error,
		lastPollOkAt: r.last_poll_ok_at,
		lastPollErrorAt: r.last_poll_error_at,
		lastPollError: r.last_poll_error
	};
}
export type IfoodStatus = Awaited<ReturnType<typeof ifoodStatus>>;

export async function saveIfoodCredentials(
	input: { clientId: string; clientSecret: string; merchantId: string },
	actor: Actor
) {
	const clientId = input.clientId.trim();
	const merchantId = input.merchantId.trim();
	const clientSecret = input.clientSecret.trim();
	if (!clientId) throw new DomainError('err.ifood.clientId');
	if (!merchantId) throw new DomainError('err.ifood.merchantId');
	if (!/^[A-Za-z0-9-]{8,64}$/.test(merchantId)) throw new DomainError('err.ifood.merchantIdShape');
	const current = await ifoodSettingsRow();
	if (!clientSecret && !current.client_secret_enc) throw new DomainError('err.ifood.clientSecret');
	const secretEnc = clientSecret ? encryptSecret(clientSecret) : current.client_secret_enc;
	await db().begin(async (tx) => {
		const credentialsChanged =
			clientId !== current.client_id ||
			merchantId !== current.merchant_id ||
			Boolean(clientSecret) ||
			current.auth_mode !== 'own';
		await tx`
			update ifood_settings set auth_mode = 'own', client_id = ${clientId}, merchant_id = ${merchantId},
				client_secret_enc = ${secretEnc},
				enabled = ${credentialsChanged ? false : current.enabled},
				last_check_at = ${credentialsChanged ? null : current.last_check_at},
				last_check_ok = ${credentialsChanged ? null : current.last_check_ok},
				last_check_error = ${credentialsChanged ? null : current.last_check_error},
				updated_by = ${actor.id}, updated_at = now()
			where shop_id = current_shop_id()`;
		await audit(tx, actor, 'ifood.credentials_saved', 'ifood_settings', '1', {
			clientId,
			merchantId,
			secretChanged: Boolean(clientSecret)
		});
	});
	invalidateIfoodSettings();
}

export async function recordIfoodCheck(ok: boolean, error: string | null) {
	await db()`update ifood_settings set last_check_at = now(), last_check_ok = ${ok},
		last_check_error = ${error} where shop_id = current_shop_id()`;
}

export async function recordIfoodPoll(ok: boolean, error: string | null = null) {
	if (ok)
		await db()`update ifood_settings set last_poll_ok_at = now() where shop_id = current_shop_id()`;
	else
		await db()`update ifood_settings set last_poll_error_at = now(), last_poll_error = ${error} where shop_id = current_shop_id()`;
}

/** Turning automatic iFood orders on needs saved credentials that just passed the test. */
export async function setIfoodEnabled(enabled: boolean, actor: Actor) {
	const r = await ifoodSettingsRow();
	if (enabled) {
		const linked = r.auth_mode === 'app' && (await getShopSecret('ifood_refresh'));
		if (!linked && (!r.client_id || !r.client_secret_enc || !r.merchant_id))
			throw new DomainError('err.ifood.saveFirst', { code: 'not_configured' });
		if (!r.merchant_id) throw new DomainError('err.ifood.saveFirst', { code: 'not_configured' });
		if (!r.last_check_ok) throw new DomainError('err.ifood.testFirst', { code: 'not_tested' });
	}
	await db().begin(async (tx) => {
		await tx`update ifood_settings set enabled = ${enabled}, updated_by = ${actor.id}, updated_at = now() where shop_id = current_shop_id()`;
		await audit(tx, actor, enabled ? 'ifood.enabled' : 'ifood.disabled', 'ifood_settings', '1');
	});
	invalidateIfoodSettings();
}
