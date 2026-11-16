// Per shop: the WhatsApp Business number and whether the bot and status messages are on.
// The access token and app secret live in shop_secrets.
import { audit, type Actor } from '../audit';
import { db } from '../db';
import { DomainError } from '../errors';
import { getShopSecret, hasShopSecret, setShopSecret } from '../platform/secrets';
import type { WhatsappCredentials } from '../messaging/whatsapp-cloud';

export const STATUS_TEMPLATES = [
	'pedido_recebido',
	'pedido_pronto',
	'saiu_para_entrega',
	'pedido_cancelado'
] as const;

export interface WhatsappSettings {
	enabled: boolean;
	phoneNumberId: string | null;
	wabaId: string | null;
	displayPhone: string | null;
	verifyToken: string;
	templates: Record<string, string>;
	hasToken: boolean;
	hasAppSecret: boolean;
	lastTestAt: Date | null;
	lastTestError: string | null;
}

interface Row {
	enabled: boolean;
	phone_number_id: string | null;
	waba_id: string | null;
	display_phone: string | null;
	verify_token: string;
	templates: Record<string, string>;
	last_test_at: Date | null;
	last_test_error: string | null;
}

async function row(): Promise<Row> {
	const [r] = await db()<Row[]>`
		insert into whatsapp_settings default values on conflict (shop_id) do nothing returning *`;
	if (r) return r;
	const [existing] = await db()<
		Row[]
	>`select * from whatsapp_settings where shop_id = current_shop_id()`;
	return existing;
}

export async function whatsappSettings(): Promise<WhatsappSettings> {
	const r = await row();
	return {
		enabled: r.enabled,
		phoneNumberId: r.phone_number_id,
		wabaId: r.waba_id,
		displayPhone: r.display_phone,
		verifyToken: r.verify_token,
		templates: r.templates ?? {},
		hasToken: await hasShopSecret('whatsapp'),
		hasAppSecret: await hasShopSecret('whatsapp_app_secret'),
		lastTestAt: r.last_test_at,
		lastTestError: r.last_test_error
	};
}

/** Whether the bot answers and status messages go out (cheap: no secret lookups). */
export async function whatsappEnabled(): Promise<boolean> {
	const [r] = await db()<{ enabled: boolean }[]>`
		select enabled from whatsapp_settings where shop_id = current_shop_id()`;
	return r?.enabled ?? false;
}

export async function whatsappCredentials(): Promise<WhatsappCredentials | null> {
	const s = await whatsappSettings();
	const token = await getShopSecret('whatsapp');
	if (!s.phoneNumberId || !token) return null;
	return { phoneNumberId: s.phoneNumberId, accessToken: token };
}

export async function saveWhatsappSettings(
	input: {
		phoneNumberId: string;
		wabaId: string;
		displayPhone: string;
		accessToken: string;
		appSecret: string;
	},
	actor: Actor
) {
	await row();
	if (!input.phoneNumberId.trim() || !/^\d+$/.test(input.phoneNumberId.trim()))
		throw new DomainError('err.wa.phoneNumberId');
	if (input.accessToken.trim()) await setShopSecret('whatsapp', input.accessToken.trim());
	if (input.appSecret.trim()) await setShopSecret('whatsapp_app_secret', input.appSecret.trim());
	if (!(await hasShopSecret('whatsapp')) || !(await hasShopSecret('whatsapp_app_secret')))
		throw new DomainError('err.wa.missing');
	await db()`update whatsapp_settings set phone_number_id = ${input.phoneNumberId.trim()},
		waba_id = ${input.wabaId.trim() || null}, display_phone = ${input.displayPhone.trim() || null},
		last_test_at = null, last_test_error = null, updated_at = now()
		where shop_id = current_shop_id()`;
	await audit(db(), actor, 'whatsapp.saved', 'whatsapp_settings', null, {});
}

export async function recordWhatsappTest(error: string | null) {
	await db()`update whatsapp_settings set last_test_at = now(), last_test_error = ${error}
		where shop_id = current_shop_id()`;
}

export async function saveTemplateStatus(templates: Record<string, string>) {
	await db()`update whatsapp_settings set templates = ${db().json(templates)}
		where shop_id = current_shop_id()`;
}

export async function setWhatsappEnabled(enabled: boolean, actor: Actor) {
	const s = await whatsappSettings();
	if (enabled && (!s.lastTestAt || s.lastTestError))
		throw new DomainError('err.wa.testFirst', { code: 'not_tested' });
	await db()`update whatsapp_settings set enabled = ${enabled}, updated_at = now()
		where shop_id = current_shop_id()`;
	await audit(
		db(),
		actor,
		enabled ? 'whatsapp.enabled' : 'whatsapp.disabled',
		'whatsapp_settings',
		null,
		{}
	);
}
