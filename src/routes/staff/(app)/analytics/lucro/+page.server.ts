// Relatórios → Lucro: per channel, what is left after commissions, fees, delivery and food.
import { attempt, formString } from '#lib/server/actions.ts';
import { profitReport, profitSettings, saveProfitSettings } from '#lib/server/analytics/profit.ts';
import { resolveRange } from '#lib/server/analytics/queries.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { parseBRL } from '#lib/domain/money.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const q = event.url.searchParams;
	const preset = q.get('range') ?? 'month';
	const range = resolveRange(preset, q.get('from'), q.get('to'));
	return { preset, range, report: await profitReport(range) };
};

const pct = (v: string) => Math.round(Number(v.replace(',', '.')) * 100);

export const actions: Actions = {
	settings: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const current = await profitSettings();
		return attempt(async () => {
			await saveProfitSettings(
				{
					ifoodCommissionBps: pct(formString(d, 'ifood')),
					ifoodDeliveryCommissionBps: pct(formString(d, 'ifoodDelivery')),
					odCommissionBps: pct(formString(d, 'od')),
					deliveryCostCents: parseBRL(formString(d, 'deliveryCost') || '0') ?? -1,
					simplesRateBps: current.simplesRateBps
				},
				staffActor(staff)
			);
			return { saved: true };
		});
	}
};
