import { requireStaff } from '#lib/server/auth/staff.ts';
import { db } from '#lib/server/db.ts';
import { currentIfoodAlerts } from '#lib/server/integrations/ifood/service.ts';
import { listOrders } from '#lib/server/orders/queries.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event);
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
	return { counts, urgent, ifoodAlerts };
};
