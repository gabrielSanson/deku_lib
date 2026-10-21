import { fail } from '@sveltejs/kit';
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { campaignResults, setCampaignStatus } from '#lib/server/campaigns/service.ts';
import type { Actions, PageServerLoad } from './$types';

const DAY = 86400_000;
const PERIODS = { '7': 7, '30': 30, '90': 90, '365': 365 } as const;
// Tabs on the list: "Todas" also shows paused campaigns, which have no tab of their own.
const TABS = ['todas', 'ativas', 'rascunhos', 'encerradas'] as const;
type Tab = (typeof TABS)[number];

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const period = (event.url.searchParams.get('dias') ?? '30') as keyof typeof PERIODS;
	const days = PERIODS[period] ?? 30;
	const tabParam = event.url.searchParams.get('status') ?? 'todas';
	const tab: Tab = (TABS as readonly string[]).includes(tabParam) ? (tabParam as Tab) : 'todas';
	const q = (event.url.searchParams.get('q') ?? '').trim().slice(0, 60);
	const to = new Date();
	const from = new Date(to.getTime() - days * DAY);
	const all = await campaignResults(from, to);

	const matchesTab = (status: string) =>
		tab === 'todas' ||
		(tab === 'ativas' && status === 'active') ||
		(tab === 'rascunhos' && status === 'draft') ||
		(tab === 'encerradas' && status === 'ended');
	const needle = q.toLowerCase();
	const campaigns = all.filter(
		(c) =>
			matchesTab(c.status) &&
			(!needle ||
				c.name.toLowerCase().includes(needle) ||
				(c.code ?? '').toLowerCase().includes(needle))
	);
	const totals = {
		active: all.filter((c) => c.status === 'active').length,
		uses: all.reduce((n, c) => n + c.uses, 0),
		discountCents: all.reduce((n, c) => n + c.discountCents, 0),
		newCustomers: all.reduce((n, c) => n + c.newCustomers, 0)
	};
	return { days, tab, q, campaigns, total: all.length, totals };
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
