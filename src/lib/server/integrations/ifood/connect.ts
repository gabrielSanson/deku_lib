// "Conectar com iFood": link the shop's iFood store to the platform's iFood app with a code,
// instead of the owner creating developer keys. TODO(verify) the flow in iFood homologation.
import { audit, type Actor } from '../../audit';
import { db } from '../../db';
import { DomainError } from '../../errors';
import { setShopSecret } from '../../platform/secrets';
import { ifoodClient } from './api';
import { appAuth, ifoodAppAvailable, type IfoodAppAuth } from './auth';
import { ifoodSettingsRow, invalidateIfoodSettings, recordIfoodCheck } from './settings';

/** Step 1: get a code for the owner to enter in the iFood Portal do Parceiro. */
export async function startIfoodLink(actor: Actor, auth: IfoodAppAuth = appAuth()) {
	if (!ifoodAppAvailable())
		throw new DomainError('err.ifood.noApp', { code: 'no_app', status: 501 });
	const code = await auth.requestUserCode();
	const expiresAt = new Date(Date.now() + code.expiresInSeconds * 1000);
	await db()`update ifood_settings set link_user_code = ${code.userCode}, link_verifier = ${code.verifier},
		link_expires_at = ${expiresAt} where shop_id = current_shop_id()`;
	await audit(db(), actor, 'ifood.link_started', 'ifood_settings', '1');
	invalidateIfoodSettings();
	return { userCode: code.userCode, verificationUrl: code.verificationUrl, expiresAt };
}

/**
 * Step 2: the owner pastes the authorization code iFood showed them. We keep the refresh token,
 * pick the store this login sees and switch the shop to the linked app.
 */
export async function finishIfoodLink(
	authorizationCode: string,
	actor: Actor,
	auth: IfoodAppAuth = appAuth(),
	merchants: () => Promise<{ id: string }[]> = () => ifoodClient().merchants()
) {
	const code = authorizationCode.trim();
	if (!code) throw new DomainError('err.ifood.noAuthCode');
	const r = await ifoodSettingsRow();
	if (!r.link_verifier || !r.link_expires_at || r.link_expires_at < new Date())
		throw new DomainError('err.ifood.linkExpired', { code: 'link_expired' });
	const t = await auth.exchangeAuthorizationCode(code, r.link_verifier);
	await setShopSecret('ifood_refresh', t.refreshToken);
	await db()`update ifood_settings set auth_mode = 'app', link_user_code = null, link_verifier = null,
		link_expires_at = null, linked_at = now(), enabled = false, last_check_at = null, last_check_ok = null,
		last_check_error = null, updated_by = ${actor.id}, updated_at = now()
		where shop_id = current_shop_id()`;
	invalidateIfoodSettings();
	let merchantId: string | null = null;
	try {
		merchantId = (await merchants())[0]?.id ?? null;
	} catch {
		// The owner can type the merchant id under Avançado.
	}
	if (merchantId) {
		await db()`update ifood_settings set merchant_id = ${merchantId} where shop_id = current_shop_id()`;
		await recordIfoodCheck(true, null);
	}
	invalidateIfoodSettings();
	await audit(db(), actor, 'ifood.linked', 'ifood_settings', '1', { merchantId });
	return { merchantId };
}

/** Back to the store's own developer keys (or nothing). */
export async function unlinkIfood(actor: Actor) {
	await setShopSecret('ifood_refresh', null);
	await db()`update ifood_settings set auth_mode = 'own', enabled = false, linked_at = null,
		updated_by = ${actor.id}, updated_at = now() where shop_id = current_shop_id()`;
	invalidateIfoodSettings();
	await audit(db(), actor, 'ifood.unlinked', 'ifood_settings', '1');
}

export async function setIfoodHomologation(on: boolean, actor: Actor) {
	await db()`update ifood_settings set homologation = ${on} where shop_id = current_shop_id()`;
	invalidateIfoodSettings();
	await audit(
		db(),
		actor,
		on ? 'ifood.homologation_on' : 'ifood.homologation_off',
		'ifood_settings',
		'1'
	);
}
