import { reconciliation, SHOP_TZ, todayLocal } from '#lib/server/analytics/queries.ts';
import { ADMIN, requireStaff } from '#lib/server/auth/staff.ts';
import { listSessionsForDay } from '#lib/server/cash/service.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const raw = event.url.searchParams.get('day');
	const day = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayLocal();
	const [rec, sessions] = await Promise.all([
		reconciliation(day),
		listSessionsForDay(day, SHOP_TZ)
	]);
	return { day, ...rec, sessions };
};
