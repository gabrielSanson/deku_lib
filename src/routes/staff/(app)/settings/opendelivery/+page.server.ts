// Configurações → 99Food e Keeta: one Open Delivery connection per partner.
// [UNVERIFIED] TODO(verify): nothing here has been tried against a partner yet.
import { fail } from '@sveltejs/kit';
import { attempt, formString, shopText } from '#lib/server/actions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { currentShopId } from '#lib/server/db.ts';
import { OD_PARTNER_LABEL, OD_PARTNERS } from '#lib/server/integrations/opendelivery/mapping.ts';
import { checkOdConnection, isOdPartner } from '#lib/server/integrations/opendelivery/service.ts';
import {
	odSettings,
	saveOdSettings,
	setOdEnabled
} from '#lib/server/integrations/opendelivery/settings.ts';
import { canStoreSecrets } from '#lib/server/secrets.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'settings.edit');
	const shopId = currentShopId();
	const partners = await Promise.all(
		OD_PARTNERS.map(async (p) => ({
			...(await odSettings(p)),
			label: OD_PARTNER_LABEL[p],
			webhookUrl: new URL(`/api/v1/integrations/opendelivery/${p}/${shopId}`, event.url).toString()
		}))
	);
	return { partners, canStoreSecrets: canStoreSecrets() };
};

async function partnerOf(data: FormData) {
	const p = formString(data, 'partner');
	return isOdPartner(p) ? p : null;
}

export const actions: Actions = {
	save: async (event) => {
		const staff = requirePermission(event, 'settings.edit');
		const data = await event.request.formData();
		const partner = await partnerOf(data);
		if (!partner) return fail(400, { error: await shopText('err.od.missing') });
		return attempt(async () => {
			await saveOdSettings(
				partner,
				{
					baseUrl: formString(data, 'baseUrl'),
					clientId: formString(data, 'clientId'),
					clientSecret: formString(data, 'clientSecret'),
					merchantId: formString(data, 'merchantId')
				},
				staffActor(staff)
			);
			return { ok: await shopText('ok.odSaved'), partner };
		});
	},
	test: async (event) => {
		requirePermission(event, 'settings.edit');
		const partner = await partnerOf(await event.request.formData());
		if (!partner) return fail(400, { error: await shopText('err.od.missing') });
		const r = await checkOdConnection(partner);
		return r.ok
			? { ok: await shopText('ok.odTested'), partner }
			: fail(400, { error: r.error, partner });
	},
	toggle: async (event) => {
		const staff = requirePermission(event, 'settings.edit');
		const data = await event.request.formData();
		const partner = await partnerOf(data);
		if (!partner) return fail(400, { error: await shopText('err.od.missing') });
		const on = formString(data, 'enabled') === 'true';
		return attempt(async () => {
			await setOdEnabled(partner, on, staffActor(staff));
			return { ok: await shopText(on ? 'ok.odOn' : 'ok.odOff'), partner };
		});
	}
};
