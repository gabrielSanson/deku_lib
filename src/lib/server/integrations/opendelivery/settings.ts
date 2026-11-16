// Per shop and partner: where the partner's Open Delivery API is, our client id there, the
// merchant id, and whether orders come in. The client secret lives in shop_secrets.
import { audit, type Actor } from '../../audit';
import { db } from '../../db';
import { DomainError } from '../../errors';
import { getShopSecret, hasShopSecret, setShopSecret } from '../../platform/secrets';
import type { OdPartner } from './mapping';

export interface OdSettings {
	partner: OdPartner;
	enabled: boolean;
	baseUrl: string | null;
	clientId: string | null;
	merchantId: string | null;
	hasSecret: boolean;
	lastCheckAt: Date | null;
	lastCheckOk: boolean | null;
	lastCheckError: string | null;
	lastPollOkAt: Date | null;
	lastPollError: string | null;
}

interface Row {
	partner: OdPartner;
	enabled: boolean;
	base_url: string | null;
	client_id: string | null;
	merchant_id: string | null;
	last_check_at: Date | null;
	last_check_ok: boolean | null;
	last_check_error: string | null;
	last_poll_ok_at: Date | null;
	last_poll_error: string | null;
}

const secretKind = (p: OdPartner) => `opendelivery_${p}` as const;

export async function odSettings(partner: OdPartner): Promise<OdSettings> {
	const [r] = await db()<Row[]>`
		select * from opendelivery_settings where shop_id = current_shop_id() and partner = ${partner}`;
	return {
		partner,
		enabled: r?.enabled ?? false,
		baseUrl: r?.base_url ?? null,
		clientId: r?.client_id ?? null,
		merchantId: r?.merchant_id ?? null,
		hasSecret: await hasShopSecret(secretKind(partner)),
		lastCheckAt: r?.last_check_at ?? null,
		lastCheckOk: r?.last_check_ok ?? null,
		lastCheckError: r?.last_check_error ?? null,
		lastPollOkAt: r?.last_poll_ok_at ?? null,
		lastPollError: r?.last_poll_error ?? null
	};
}

export async function odCredentials(partner: OdPartner) {
	const s = await odSettings(partner);
	const secret = await getShopSecret(secretKind(partner));
	if (!s.baseUrl || !s.clientId || !secret || !s.merchantId) return null;
	return {
		baseUrl: s.baseUrl,
		clientId: s.clientId,
		clientSecret: secret,
		merchantId: s.merchantId
	};
}

export async function saveOdSettings(
	partner: OdPartner,
	input: { baseUrl: string; clientId: string; clientSecret: string; merchantId: string },
	actor: Actor
) {
	let url: URL;
	try {
		url = new URL(input.baseUrl.trim());
	} catch {
		throw new DomainError('err.od.baseUrl');
	}
	if (url.protocol !== 'https:' && url.hostname !== 'localhost')
		throw new DomainError('err.od.baseUrl');
	if (!input.clientId.trim() || !input.merchantId.trim()) throw new DomainError('err.od.missing');
	if (input.clientSecret.trim())
		await setShopSecret(secretKind(partner), input.clientSecret.trim());
	else if (!(await hasShopSecret(secretKind(partner)))) throw new DomainError('err.od.missing');
	await db()`
		insert into opendelivery_settings (partner, base_url, client_id, merchant_id, enabled)
		values (${partner}, ${url.toString().replace(/\/$/, '')}, ${input.clientId.trim()}, ${input.merchantId.trim()}, false)
		on conflict (shop_id, partner) do update set base_url = excluded.base_url, client_id = excluded.client_id,
			merchant_id = excluded.merchant_id, enabled = false, last_check_at = null, last_check_ok = null,
			last_check_error = null, updated_at = now()`;
	await audit(db(), actor, 'opendelivery.saved', 'opendelivery_settings', null, { partner });
}

export async function recordOdCheck(partner: OdPartner, ok: boolean, error: string | null) {
	await db()`update opendelivery_settings set last_check_at = now(), last_check_ok = ${ok},
		last_check_error = ${error} where shop_id = current_shop_id() and partner = ${partner}`;
}

export async function recordOdPoll(partner: OdPartner, ok: boolean, error: string | null = null) {
	if (ok)
		await db()`update opendelivery_settings set last_poll_ok_at = now()
			where shop_id = current_shop_id() and partner = ${partner}`;
	else
		await db()`update opendelivery_settings set last_poll_error_at = now(), last_poll_error = ${error}
			where shop_id = current_shop_id() and partner = ${partner}`;
}

export async function setOdEnabled(partner: OdPartner, enabled: boolean, actor: Actor) {
	const s = await odSettings(partner);
	if (enabled && !s.lastCheckOk) throw new DomainError('err.od.testFirst', { code: 'not_tested' });
	await db()`update opendelivery_settings set enabled = ${enabled}, updated_at = now()
		where shop_id = current_shop_id() and partner = ${partner}`;
	await audit(
		db(),
		actor,
		enabled ? 'opendelivery.enabled' : 'opendelivery.disabled',
		'opendelivery_settings',
		null,
		{
			partner
		}
	);
}

export async function enabledOdPartners(): Promise<OdPartner[]> {
	return (
		await db()<{ partner: OdPartner }[]>`
			select partner from opendelivery_settings where shop_id = current_shop_id() and enabled`
	).map((r) => r.partner);
}
