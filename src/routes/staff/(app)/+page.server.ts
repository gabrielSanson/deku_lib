import { overview, salesByDay, todayLocal, topProducts } from '#lib/server/analytics/queries.ts';
import { ADMIN, requireStaff } from '#lib/server/auth/staff.ts';
import { db } from '#lib/server/db.ts';
import { currentIfoodAlerts } from '#lib/server/integrations/ifood/service.ts';
import { listOrders } from '#lib/server/orders/queries.ts';
import type { PageServerLoad } from './$types';

const shift = (day: string, days: number) =>
	new Date(new Date(`${day}T00:00:00Z`).getTime() + days * 86400_000).toISOString().slice(0, 10);

/** Today's money for owners and managers, next to the same weekday last week. */
async function salesToday() {
	const today = todayLocal();
	const lastWeek = shift(today, -7);
	const [now, before, week, top] = await Promise.all([
		overview({ from: today, to: today }),
		overview({ from: lastWeek, to: lastWeek }),
		salesByDay({ from: shift(today, -13), to: today }),
		topProducts({ from: today, to: today })
	]);
	return { today, now, before, week, top: top.products.slice(0, 5) };
}

export const load: PageServerLoad = async (event) => {
	const staff = requireStaff(event);
	event.depends('app:orders');
	const sql = db();
	const [counts] = await sql<
		{ new: number; open: number; ready: number; today: number; unpaid: number; dead: number }[]
	>`
		select
			count(*) filter (where status = 'new')::int as new,
			count(*) filter (where status in ('confirmed','preparing'))::int as open,
			count(*) filter (where status = 'ready')::int as ready,
			count(*) filter (where created_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')::int as today,
			count(*) filter (where payment_status in ('pending','unknown') and status not in ('cancelled','rejected')
				and created_at > now() - interval '24 hours')::int as unpaid,
			(select count(*)::int from channel_events where processing_status in ('failed','dead')) as dead
		from orders where created_at > now() - interval '2 days' or status in ('new','confirmed','preparing','ready')`;
	const urgent = await listOrders({ statuses: ['new'], limit: 20 });
	const ifoodAlerts = await currentIfoodAlerts().catch((err) => {
		console.error(JSON.stringify({ msg: 'ifood alerts failed', err: String(err) }));
		return [] as string[];
	});
	const sales = ADMIN.includes(staff.role) ? await salesToday() : null;
	return { counts, urgent, ifoodAlerts, sales };
};
