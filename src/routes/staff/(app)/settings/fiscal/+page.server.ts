// NFC-e settings: off until the shop's fiscal data and the provider token are in.
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { getFiscalSettings, saveFiscalSettings } from '#lib/server/fiscal/service.ts';
import { canStoreSecrets } from '#lib/server/secrets.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	return { settings: await getFiscalSettings(), canStoreSecrets: canStoreSecrets() };
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		return attempt(async () => {
			await saveFiscalSettings(
				{
					enabled: d.get('enabled') === 'on',
					environment: formString(d, 'environment') === 'producao' ? 'producao' : 'homologacao',
					cnpj: formString(d, 'cnpj'),
					token: formString(d, 'token') || null,
					defaultNcm: formString(d, 'defaultNcm'),
					defaultCfop: formString(d, 'defaultCfop'),
					defaultCsosn: formString(d, 'defaultCsosn')
				},
				staffActor(staff)
			);
			return { ok: true };
		});
	}
};
