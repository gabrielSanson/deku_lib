// NFC-e settings: off until the shop's fiscal data and the provider token are in.
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import {
	getFiscalSettings,
	listIbsCbsRates,
	ratesNeedConfirmation,
	saveFiscalSettings,
	saveIbsCbsRates,
	type Crt
} from '#lib/server/fiscal/service.ts';
import { canStoreSecrets } from '#lib/server/secrets.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const rates = await listIbsCbsRates();
	return {
		settings: await getFiscalSettings(),
		canStoreSecrets: canStoreSecrets(),
		rates: rates.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })),
		confirmYear: ratesNeedConfirmation(rates)
	};
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
	},
	/** Reforma tributária: regime, the IBS/CBS switch and default codes. */
	saveTax: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		return attempt(async () => {
			const s = await getFiscalSettings();
			await saveFiscalSettings(
				{
					enabled: s.enabled,
					environment: s.environment,
					cnpj: s.cnpj ?? '',
					token: null,
					defaultNcm: s.defaultNcm ?? '',
					defaultCfop: s.defaultCfop,
					defaultCsosn: s.defaultCsosn,
					crt: formString(d, 'crt') as Crt,
					ibsCbsEnabled: d.get('ibsCbsEnabled') === 'on',
					ibsCbsCst: formString(d, 'ibsCbsCst'),
					ibsCbsClass: formString(d, 'ibsCbsClass')
				},
				staffActor(staff)
			);
			return { taxOk: true };
		});
	},
	/** The rates table; saving it is the owner confirming the rates with the accountant. */
	saveRates: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const years = d.getAll('year').map(String);
		const rows = years
			.map((y, i) => ({
				year: Number(y),
				cbsRate: String(d.getAll('cbsRate')[i] ?? ''),
				ibsUfRate: String(d.getAll('ibsUfRate')[i] ?? ''),
				ibsMunRate: String(d.getAll('ibsMunRate')[i] ?? ''),
				note: String(d.getAll('note')[i] ?? '')
			}))
			// The empty row at the end adds a year only when it is filled in.
			.filter((r) => r.year || r.cbsRate || r.ibsUfRate || r.ibsMunRate);
		return attempt(async () => {
			await saveIbsCbsRates(rows, staffActor(staff));
			return { ratesOk: true };
		});
	}
};
