// The help centre's "Falar com o suporte" WhatsApp link (S5.13), set in the platform console.
import { normalizeBrPhone } from '#lib/domain/phone.ts';
import { audit, type Actor } from '../audit';
import { platformDb } from '../db';
import { DomainError } from '../errors';

export async function supportWhatsapp(): Promise<string | null> {
	const [r] = await platformDb()<{ support_whatsapp: string | null }[]>`
		select support_whatsapp from platform_settings where id = 1`;
	return r?.support_whatsapp ?? null;
}

/** wa.me wants digits only, with the country code. */
export const whatsappLink = (e164: string) => `https://wa.me/${e164.replace(/\D/g, '')}`;

export async function saveSupportWhatsapp(raw: string, actor: Actor) {
	const phone = raw.trim() ? normalizeBrPhone(raw) : null;
	if (raw.trim() && !phone) throw new DomainError('err.order.phone');
	await platformDb()`update platform_settings set support_whatsapp = ${phone}, updated_at = now() where id = 1`;
	await audit(platformDb(), actor, 'platform.support_whatsapp', 'platform_settings', null, {
		set: Boolean(phone)
	});
	return phone;
}
