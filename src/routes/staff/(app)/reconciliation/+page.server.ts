import { reconciliation, todayLocal } from '#lib/server/analytics/queries.ts';
import { ADMIN, requireStaff } from '#lib/server/auth/staff.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const raw = event.url.searchParams.get('day');
	const day = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayLocal();
	return { day, ...(await reconciliation(day)) };
};
