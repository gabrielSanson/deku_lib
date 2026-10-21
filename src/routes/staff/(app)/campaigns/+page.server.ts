import { fail } from '@sveltejs/kit';
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { campaignResults, setCampaignStatus } from '#lib/server/campaigns/service.ts';
import type { Actions, PageServerLoad } from './$types';

const DAY = 86400_000;
const PERIODS = { '7': 7, '30': 30, '90': 90, '365': 365 } as const;

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const period = (event.url.searchParams.get('dias') ?? '30') as keyof typeof PERIODS;
	const days = PERIODS[period] ?? 30;
	const to = new Date();
	const from = new Date(to.getTime() - days * DAY);
	return { days, campaigns: await campaignResults(from, to) };
};

export const actions: Actions = {
	status: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const status = formString(d, 'status');
		if (status !== 'active' && status !== 'paused' && status !== 'ended')
			return fail(400, { error: 'Ação inválida.' });
		return attempt(async () => {
			await setCampaignStatus(formString(d, 'id'), status, staffActor(staff));
			return { ok: true };
		});
	}
};
