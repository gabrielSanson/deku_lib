// Per-shop secrets (payment and channel keys), encrypted with APP_SECRET. shop_secrets has no
// policy for the shop role, so this module reaches it through the platform pool, always for the
// shop of the current work.
import { currentShopId, platformDb } from '../db';
import { decryptSecret, encryptSecret } from '../secrets';

export type SecretKind =
	| 'mercadopago_token'
	| 'mercadopago_webhook'
	| 'ifood'
	| 'ifood_refresh'
	| 'opendelivery_99food'
	| 'opendelivery_keeta'
	| 'focusnfe_token'
	| 'whatsapp'
	| 'whatsapp_app_secret'
	| 'psp_pix_cert'
	| 'psp_pix_cert_pass'
	| 'efi_client_secret'
	| 'efi_webhook';

export async function getShopSecret(
	kind: SecretKind,
	shopId = currentShopId()
): Promise<string | null> {
	const [r] = await platformDb()<{ ciphertext: string }[]>`
		select ciphertext from shop_secrets where shop_id = ${shopId} and kind = ${kind}`;
	if (!r) return null;
	try {
		return decryptSecret(r.ciphertext);
	} catch {
		return null;
	}
}

export async function hasShopSecret(kind: SecretKind, shopId = currentShopId()): Promise<boolean> {
	const [r] =
		await platformDb()`select 1 from shop_secrets where shop_id = ${shopId} and kind = ${kind}`;
	return Boolean(r);
}

/** Saves (or with null, removes) a secret of the current shop. */
export async function setShopSecret(
	kind: SecretKind,
	value: string | null,
	shopId = currentShopId()
) {
	if (value === null) {
		await platformDb()`delete from shop_secrets where shop_id = ${shopId} and kind = ${kind}`;
		return;
	}
	await platformDb()`
		insert into shop_secrets (shop_id, kind, ciphertext) values (${shopId}, ${kind}, ${encryptSecret(value)})
		on conflict (shop_id, kind) do update set ciphertext = excluded.ciphertext, updated_at = now()`;
}
