import * as a from '#lib/server/analytics/queries.ts';
import { MANAGERS, requireStaff } from '#lib/server/auth/staff.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, MANAGERS);
	const q = event.url.searchParams;
	const preset = q.get('range') ?? '7d';
	const range = a.resolveRange(preset, q.get('from'), q.get('to'));
	const prev = a.previousRange(range);
	const filters = { channel: q.get('channel') || null };
	const [current, previous, daily, channels, methods, peaks, products] = await Promise.all([
		a.overview(range, filters),
		a.overview(prev, filters),
		a.salesByDay(range, filters),
		a.salesByChannel(range),
		a.collectedByMethod(range),
		a.peakHours(range, filters),
		a.topProducts(range, filters)
	]);
	return {
		preset,
		range,
		prev,
		filters,
		current,
		previous,
		daily,
		channels,
		methods,
		peaks,
		products,
		definitions: a.METRIC_DEFINITIONS,
		generatedAt: new Date()
	};
};
