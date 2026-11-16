import { openAlerts } from '#lib/server/alerts/service.ts';
import { ADMIN, requireStaff } from '#lib/server/auth/staff.ts';
import { overview, salesByHour, todayLocal } from '#lib/server/analytics/queries.ts';
import { attempt } from '#lib/server/actions.ts';
import { markRatingSeen, ratingSummary } from '#lib/server/customers/ratings.ts';
import { db } from '#lib/server/db.ts';
import { currentIfoodAlerts } from '#lib/server/integrations/ifood/service.ts';
import { listOrders } from '#lib/server/orders/queries.ts';
import type { Actions, PageServerLoad } from './$types';

const shift = (day: string, days: number) =>
	new Date(new Date(`${day}T00:00:00Z`).getTime() + days * 86400_000).toISOString().slice(0, 10);

/** Today's money for owners and managers, next to yesterday and the hour-by-hour curve. */
async function salesToday() {
	const today = todayLocal();
	const yesterday = shift(today, -1);
	const [now, before, hours] = await Promise.all([
		overview({ from: today, to: today }),
		overview({ from: yesterday, to: yesterday }),
		salesByHour(today)
	]);
	return { today, now, before, hours };
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
	const inProgress = await listOrders({ statuses: ['confirmed', 'preparing'], limit: 60 });
	const now = Date.now();
	// Orders past their promised time, latest first, for the "Agora" panel.
	const late = inProgress.filter((o) => o.promisedAt && o.promisedAt.getTime() < now).slice(0, 10);
	const ifoodAlerts = await currentIfoodAlerts().catch((err) => {
		console.error(JSON.stringify({ msg: 'ifood alerts failed', err: String(err) }));
		return [] as string[];
	});
	const sales = ADMIN.includes(staff.role) ? await salesToday() : null;
	const systemAlerts = (await openAlerts()).map((a) => ({ kind: a.kind, detail: a.detail }));
	const ratings = staff.role === 'kitchen' ? null : await ratingSummary();
	return { counts, urgent, late, ifoodAlerts, sales, systemAlerts, ratings };
};

export const actions: Actions = {
	/** A low rating someone has read. */
	ratingSeen: async (event) => {
		const staff = requireStaff(event);
		const orderId = String((await event.request.formData()).get('orderId') ?? '');
		if (!/^[0-9a-f-]{36}$/.test(orderId)) return { ok: false };
		return attempt(async () => {
			await markRatingSeen(orderId, { type: 'staff', id: staff.id });
			return { ok: true };
		});
	}
};
