// Where the iFood connection comes from: what the owner saved in the setup
// wizard (secret encrypted), or else the IFOOD_* environment variables.
// The worker re-reads this every few seconds, so turning iFood on or off in the
// app takes effect without a restart.
import { audit, type Actor } from '../../audit';
import { config } from '../../config';
import { db, type Db } from '../../db';
import { DomainError } from '../../errors';
import { decryptSecret, encryptSecret } from '../../secrets';

export interface IfoodSettings {
	source: 'app' | 'env' | 'none';
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
}

const TTL_MS = 5_000;
let cache: { value: IfoodSettings; at: number } | undefined;

export function invalidateIfoodSettings() {
	cache = undefined;
}

async function row(sql: Db = db()): Promise<Row> {
	const [r] = await sql<Row[]>`select * from ifood_settings where id = 1`;
	return r;
}

export async function ifoodSettings({ fresh = false } = {}): Promise<IfoodSettings> {
	if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache.value;
	const c = config();
	const r = await row();
	let value: IfoodSettings;
	if (r.client_id && r.client_secret_enc) {
		let secret: string | null = null;
		let problem: string | null = null;
		try {
			secret = decryptSecret(r.client_secret_enc);
		} catch {
			problem =
				'O Client Secret salvo não pode ser lido (o APP_SECRET do servidor mudou). Digite o Client Secret de novo.';
		}
		value = {
			source: 'app',
			enabled: r.enabled && !problem,
			clientId: r.client_id,
			clientSecret: secret,
			merchantId: r.merchant_id,
			apiBase: c.IFOOD_API_BASE,
			problem
		};
	} else if (c.IFOOD_CLIENT_ID) {
		value = {
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
			source: 'none',
			enabled: c.IFOOD_ENABLED,
			clientId: null,
			clientSecret: null,
			merchantId: null,
			apiBase: c.IFOOD_API_BASE,
			problem: null
		};
	}
	cache = { value, at: Date.now() };
	return value;
}

/** What the setup and integration screens show. Never includes the secret. */
export async function ifoodStatus() {
	const [s, r] = await Promise.all([ifoodSettings({ fresh: true }), row()]);
	return {
		source: s.source,
		enabled: s.enabled,
		clientId: s.clientId,
		merchantId: s.merchantId,
		hasSecret: Boolean(s.clientSecret),
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
	if (!clientId) throw new DomainError('Informe o Client ID.');
	if (!merchantId) throw new DomainError('Informe o Merchant ID (código da loja no iFood).');
	if (!/^[A-Za-z0-9-]{8,64}$/.test(merchantId))
		throw new DomainError(
			'O Merchant ID costuma ser um código como 1a2b3c4d-…; confira se copiou o valor certo.'
		);
	const current = await row();
	if (!clientSecret && !current.client_secret_enc)
		throw new DomainError('Informe o Client Secret.');
	const secretEnc = clientSecret ? encryptSecret(clientSecret) : current.client_secret_enc;
	await db().begin(async (tx) => {
		const credentialsChanged =
			clientId !== current.client_id || merchantId !== current.merchant_id || Boolean(clientSecret);
		await tx`
			update ifood_settings set client_id = ${clientId}, merchant_id = ${merchantId},
				client_secret_enc = ${secretEnc},
				enabled = ${credentialsChanged ? false : current.enabled},
				last_check_at = ${credentialsChanged ? null : current.last_check_at},
				last_check_ok = ${credentialsChanged ? null : current.last_check_ok},
				last_check_error = ${credentialsChanged ? null : current.last_check_error},
				updated_by = ${actor.id}, updated_at = now()
			where id = 1`;
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
		last_check_error = ${error} where id = 1`;
}

export async function recordIfoodPoll(ok: boolean, error: string | null = null) {
	if (ok) await db()`update ifood_settings set last_poll_ok_at = now() where id = 1`;
	else
		await db()`update ifood_settings set last_poll_error_at = now(), last_poll_error = ${error} where id = 1`;
}

/** Turning automatic iFood orders on needs saved credentials that just passed the test. */
export async function setIfoodEnabled(enabled: boolean, actor: Actor) {
	const r = await row();
	if (enabled) {
		if (!r.client_id || !r.client_secret_enc || !r.merchant_id)
			throw new DomainError('Salve as credenciais do iFood antes de ligar.', 'not_configured');
		if (!r.last_check_ok)
			throw new DomainError('Teste a conexão com sucesso antes de ligar o iFood.', 'not_tested');
	}
	await db().begin(async (tx) => {
		await tx`update ifood_settings set enabled = ${enabled}, updated_by = ${actor.id}, updated_at = now() where id = 1`;
		await audit(tx, actor, enabled ? 'ifood.enabled' : 'ifood.disabled', 'ifood_settings', '1');
	});
	invalidateIfoodSettings();
}
