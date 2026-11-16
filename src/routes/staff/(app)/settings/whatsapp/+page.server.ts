// Configurações → WhatsApp: the Business number, test message, template status and on/off.
// [UNVERIFIED] TODO(verify): Graph API calls and the hello_world test template.
import { fail } from '@sveltejs/kit';
import { normalizeBrPhone } from '#lib/domain/phone.ts';
import { attempt, formString, shopText } from '#lib/server/actions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { currentShopId } from '#lib/server/db.ts';
import { providerFor } from '#lib/server/messaging/outbox.ts';
import { fetchTemplateStatus } from '#lib/server/messaging/whatsapp-cloud.ts';
import { getShopSecret } from '#lib/server/platform/secrets.ts';
import { canStoreSecrets } from '#lib/server/secrets.ts';
import {
	recordWhatsappTest,
	saveTemplateStatus,
	saveWhatsappSettings,
	setWhatsappEnabled,
	STATUS_TEMPLATES,
	whatsappSettings
} from '#lib/server/whatsapp/settings.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'settings.edit');
	return {
		settings: await whatsappSettings(),
		statusTemplates: [...STATUS_TEMPLATES],
		canStoreSecrets: canStoreSecrets(),
		webhookUrl: new URL(`/api/v1/whatsapp/${currentShopId()}`, event.url).toString()
	};
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requirePermission(event, 'settings.edit');
		const data = await event.request.formData();
		return attempt(async () => {
			await saveWhatsappSettings(
				{
					phoneNumberId: formString(data, 'phoneNumberId'),
					wabaId: formString(data, 'wabaId'),
					displayPhone: formString(data, 'displayPhone'),
					accessToken: formString(data, 'accessToken'),
					appSecret: formString(data, 'appSecret')
				},
				staffActor(staff)
			);
			return { ok: await shopText('ok.waSaved') };
		});
	},
	test: async (event) => {
		requirePermission(event, 'settings.edit');
		const to = normalizeBrPhone(formString(await event.request.formData(), 'to'));
		if (!to) return fail(400, { error: await shopText('err.wa.testTo') });
		try {
			const provider = await providerFor('whatsapp');
			// hello_world is the sample template every new business account has. TODO(verify)
			await provider.send({ to, template: 'hello_world', vars: {} });
			await recordWhatsappTest(null);
			return { ok: await shopText('ok.waTested') };
		} catch (err) {
			const detail = String((err as { body?: string }).body || err).slice(0, 300);
			await recordWhatsappTest(detail);
			return fail(400, { error: await shopText('err.wa.testFailed', { detail }) });
		}
	},
	templates: async (event) => {
		requirePermission(event, 'settings.edit');
		const s = await whatsappSettings();
		const token = await getShopSecret('whatsapp');
		if (!s.wabaId || !token) return fail(400, { error: await shopText('err.wa.missing') });
		try {
			await saveTemplateStatus(await fetchTemplateStatus(s.wabaId, token));
			return { ok: await shopText('ok.waTemplates') };
		} catch (err) {
			const detail = String((err as { body?: string }).body || err).slice(0, 300);
			return fail(400, { error: await shopText('err.wa.testFailed', { detail }) });
		}
	},
	toggle: async (event) => {
		const staff = requirePermission(event, 'settings.edit');
		const on = formString(await event.request.formData(), 'enabled') === 'true';
		return attempt(async () => {
			await setWhatsappEnabled(on, staffActor(staff));
			return { ok: await shopText(on ? 'ok.waOn' : 'ok.waOff') };
		});
	}
};
