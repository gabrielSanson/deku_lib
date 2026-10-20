// CSV export of orders for a range. No phone numbers or addresses.
import * as a from '#lib/server/analytics/queries.ts';
import { audit } from '#lib/server/audit.ts';
import { MANAGERS, requireStaff } from '#lib/server/auth/staff.ts';
import { db } from '#lib/server/db.ts';
import type { RequestHandler } from './$types';

const csv = (v: unknown) => {
	const s = v === null || v === undefined ? '' : String(v);
	return /[",\n;]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s;
};

export const GET: RequestHandler = async (event) => {
	const staff = requireStaff(event, MANAGERS);
	const q = event.url.searchParams;
	const range = a.resolveRange(q.get('range') ?? '7d', q.get('from'), q.get('to'));
	const rows = await db()`
		select order_number, to_char(created_at at time zone ${a.SHOP_TZ}, 'YYYY-MM-DD HH24:MI') as created_local,
			channel, source_mode, fulfillment_type, fulfillment_provider, status, payment_status,
			subtotal_cents, discount_cents, delivery_fee_cents, total_cents
		from orders
		where not is_test
			and created_at >= (${range.from + ' 00:00:00'}::timestamp at time zone ${a.SHOP_TZ})
			and created_at < ((${range.to + ' 00:00:00'}::timestamp + interval '1 day') at time zone ${a.SHOP_TZ})
		order by created_at
		limit 50000`;
	await audit(db(), { type: 'staff', id: staff.id }, 'analytics.export', 'orders', null, { range, rows: rows.length });
	const header = Object.keys(rows[0] ?? { order_number: '' });
	const body = [header.join(','), ...rows.map((r) => header.map((h) => csv((r as Record<string, unknown>)[h])).join(','))].join('\n');
	return new Response('﻿' + body, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="pedidos_${range.from}_${range.to}.csv"`
		}
	});
};
