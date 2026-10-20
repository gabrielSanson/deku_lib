// Operational analytics straight from the transactional tables. Every metric
// below has its definition in METRIC_DEFINITIONS, shown in the dashboard glossary.
// These are operational figures, not accounting or tax revenue.
import { db, type Db } from '../db';

export const SHOP_TZ = 'America/Sao_Paulo';

export const METRIC_DEFINITIONS = {
	placed: 'Pedidos criados no período (exceto testes), pela data de criação no horário da loja.',
	cancelled: 'Pedidos do período que terminaram cancelados ou recusados.',
	completed: 'Pedidos do período que chegaram a “Concluído”.',
	gross: 'Soma de itens + taxa de entrega dos pedidos do período que não foram cancelados/recusados, antes de descontos.',
	discounts: 'Descontos concedidos nesses mesmos pedidos.',
	refunds: 'Estornos confirmados no período (pela data do estorno).',
	net: 'Vendas brutas − descontos − estornos. Valor operacional; não é receita contábil.',
	collected: 'Pagamentos confirmados no período (pela data de confirmação). Pendentes e desconhecidos ficam de fora. Pedidos pagos no iFood aparecem à parte.',
	aov: 'Ticket médio: (vendas brutas − descontos) dos pedidos concluídos ÷ número de pedidos concluídos.',
	cancellationRate: 'Cancelados ou recusados ÷ pedidos criados no período.',
	prepTime: 'Tempo de preparo: de “Confirmado” até “Pronto”. Mostra mediana e p90 e quantos pedidos entraram no cálculo.',
	onTime: 'Pedidos concluídos com horário prometido em que “Pronto” ocorreu até o horário prometido ÷ pedidos concluídos com os dois horários.',
	peakHour: 'Hora local (America/Sao_Paulo) da criação do pedido.'
} as const;

export interface Range {
	/** Inclusive local date, YYYY-MM-DD. */
	from: string;
	/** Inclusive local date, YYYY-MM-DD. */
	to: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function previousRange(r: Range): Range {
	const from = new Date(`${r.from}T00:00:00Z`);
	const to = new Date(`${r.to}T00:00:00Z`);
	const days = Math.round((to.getTime() - from.getTime()) / 86400_000) + 1;
	const pTo = new Date(from.getTime() - 86400_000);
	const pFrom = new Date(pTo.getTime() - (days - 1) * 86400_000);
	return { from: pFrom.toISOString().slice(0, 10), to: pTo.toISOString().slice(0, 10) };
}

export function todayLocal(now = new Date()): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TZ }).format(now);
}

/** Resolves presets into a local-date range. */
export function resolveRange(preset: string | null, from?: string | null, to?: string | null, now = new Date()): Range {
	const today = todayLocal(now);
	const shift = (d: string, days: number) =>
		new Date(new Date(`${d}T00:00:00Z`).getTime() + days * 86400_000).toISOString().slice(0, 10);
	switch (preset) {
		case 'yesterday':
			return { from: shift(today, -1), to: shift(today, -1) };
		case '7d':
			return { from: shift(today, -6), to: today };
		case '28d':
			return { from: shift(today, -27), to: today };
		case '30d':
			return { from: shift(today, -29), to: today };
		case 'month':
			return { from: `${today.slice(0, 8)}01`, to: today };
		case 'custom':
			if (from && to && DATE_RE.test(from) && DATE_RE.test(to) && from <= to) {
				// Cap custom ranges at one year to keep queries bounded.
				return from < shift(to, -366) ? { from: shift(to, -366), to } : { from, to };
			}
			return { from: today, to: today };
		default:
			return { from: today, to: today };
	}
}

export interface Filters {
	channel?: string | null;
}

function bounds(r: Range) {
	return { start: `${r.from} 00:00:00`, end: `${r.to} 00:00:00` };
}

export interface Overview {
	placed: number;
	cancelled: number;
	completed: number;
	grossCents: number;
	discountCents: number;
	refundCents: number;
	netCents: number;
	collectedCents: number;
	ifoodPaidCents: number;
	aovCents: number | null;
	cancellationRate: number | null;
	prep: { medianMin: number | null; p90Min: number | null; n: number };
	onTime: { rate: number | null; n: number };
	paymentExceptions: number;
}

export async function overview(range: Range, filters: Filters = {}, sql: Db = db()): Promise<Overview> {
	const { start, end } = bounds(range);
	const channel = filters.channel || null;
	const [o] = await sql<
		{
			placed: number;
			cancelled: number;
			completed: number;
			gross: number;
			discount: number;
			completed_net: number;
			ifood_paid: number;
			exceptions: number;
			prep_median: number | null;
			prep_p90: number | null;
			prep_n: number;
			ontime_ok: number;
			ontime_n: number;
		}[]
	>`
		with o as (
			select * from orders
			where not is_test
				and created_at >= (${start}::timestamp at time zone ${SHOP_TZ})
				and created_at < ((${end}::timestamp + interval '1 day') at time zone ${SHOP_TZ})
				and (${channel}::text is null or channel = ${channel})
		)
		select
			count(*)::int as placed,
			count(*) filter (where status in ('cancelled','rejected'))::int as cancelled,
			count(*) filter (where status = 'completed')::int as completed,
			coalesce(sum(subtotal_cents + delivery_fee_cents) filter (where status not in ('cancelled','rejected')), 0)::bigint as gross,
			coalesce(sum(discount_cents) filter (where status not in ('cancelled','rejected')), 0)::bigint as discount,
			coalesce(sum(subtotal_cents + delivery_fee_cents - discount_cents) filter (where status = 'completed'), 0)::bigint as completed_net,
			coalesce(sum(total_cents) filter (where channel = 'ifood' and payment_status = 'paid' and status not in ('cancelled','rejected')), 0)::bigint as ifood_paid,
			count(*) filter (where payment_status in ('unknown','failed') and status not in ('cancelled','rejected'))::int as exceptions,
			percentile_cont(0.5) within group (order by extract(epoch from ready_at - accepted_at) / 60)
				filter (where ready_at is not null and accepted_at is not null) as prep_median,
			percentile_cont(0.9) within group (order by extract(epoch from ready_at - accepted_at) / 60)
				filter (where ready_at is not null and accepted_at is not null) as prep_p90,
			count(*) filter (where ready_at is not null and accepted_at is not null)::int as prep_n,
			count(*) filter (where status = 'completed' and promised_at is not null and ready_at is not null and ready_at <= promised_at)::int as ontime_ok,
			count(*) filter (where status = 'completed' and promised_at is not null and ready_at is not null)::int as ontime_n
		from o`;
	const [money] = await sql<{ collected: number; refunds: number }[]>`
		select
			coalesce(sum(t.amount_cents) filter (where t.status = 'paid'
				and t.confirmed_at >= (${start}::timestamp at time zone ${SHOP_TZ})
				and t.confirmed_at < ((${end}::timestamp + interval '1 day') at time zone ${SHOP_TZ})), 0)::bigint as collected,
			coalesce(sum(t.amount_cents) filter (where t.status = 'refunded'
				and t.refunded_at >= (${start}::timestamp at time zone ${SHOP_TZ})
				and t.refunded_at < ((${end}::timestamp + interval '1 day') at time zone ${SHOP_TZ})), 0)::bigint as refunds
		from tenders t join orders ord on ord.id = t.order_id
		where not ord.is_test and (${channel}::text is null or ord.channel = ${channel})`;
	const gross = Number(o.gross);
	const discount = Number(o.discount);
	const refunds = Number(money.refunds);
	return {
		placed: o.placed,
		cancelled: o.cancelled,
		completed: o.completed,
		grossCents: gross,
		discountCents: discount,
		refundCents: refunds,
		netCents: gross - discount - refunds,
		collectedCents: Number(money.collected),
		ifoodPaidCents: Number(o.ifood_paid),
		aovCents: o.completed ? Math.round(Number(o.completed_net) / o.completed) : null,
		cancellationRate: o.placed ? o.cancelled / o.placed : null,
		prep: {
			medianMin: o.prep_median === null ? null : Math.round(o.prep_median * 10) / 10,
			p90Min: o.prep_p90 === null ? null : Math.round(o.prep_p90 * 10) / 10,
			n: o.prep_n
		},
		onTime: { rate: o.ontime_n ? o.ontime_ok / o.ontime_n : null, n: o.ontime_n },
		paymentExceptions: o.exceptions
	};
}

export interface DailyPoint {
	day: string;
	orders: number;
	grossCents: number;
}

export async function salesByDay(range: Range, filters: Filters = {}, sql: Db = db()): Promise<DailyPoint[]> {
	const { start, end } = bounds(range);
	const channel = filters.channel || null;
	const rows = await sql<{ day: string; orders: number; gross: number }[]>`
		with days as (
			select generate_series(${range.from}::date, ${range.to}::date, interval '1 day')::date as day
		), o as (
			select (created_at at time zone ${SHOP_TZ})::date as day, subtotal_cents + delivery_fee_cents as gross, status
			from orders
			where not is_test
				and created_at >= (${start}::timestamp at time zone ${SHOP_TZ})
				and created_at < ((${end}::timestamp + interval '1 day') at time zone ${SHOP_TZ})
				and (${channel}::text is null or channel = ${channel})
		)
		select to_char(d.day, 'YYYY-MM-DD') as day,
			count(o.day) filter (where o.status not in ('cancelled','rejected'))::int as orders,
			coalesce(sum(o.gross) filter (where o.status not in ('cancelled','rejected')), 0)::bigint as gross
		from days d left join o on o.day = d.day
		group by d.day order by d.day`;
	return rows.map((r) => ({ day: r.day, orders: r.orders, grossCents: Number(r.gross) }));
}

export interface Breakdown {
	key: string;
	orders: number;
	grossCents: number;
}

export async function salesByChannel(range: Range, sql: Db = db()): Promise<Breakdown[]> {
	const { start, end } = bounds(range);
	const rows = await sql<{ key: string; orders: number; gross: number }[]>`
		select channel || ':' || fulfillment_type as key, count(*)::int as orders,
			coalesce(sum(subtotal_cents + delivery_fee_cents), 0)::bigint as gross
		from orders
		where not is_test and status not in ('cancelled','rejected')
			and created_at >= (${start}::timestamp at time zone ${SHOP_TZ})
			and created_at < ((${end}::timestamp + interval '1 day') at time zone ${SHOP_TZ})
		group by 1 order by gross desc`;
	return rows.map((r) => ({ key: r.key, orders: r.orders, grossCents: Number(r.gross) }));
}

export async function collectedByMethod(range: Range, sql: Db = db()) {
	const { start, end } = bounds(range);
	const rows = await sql<{ method: string; status: string; n: number; amount: number }[]>`
		select t.method, t.status, count(*)::int as n, coalesce(sum(t.amount_cents), 0)::bigint as amount
		from tenders t join orders o on o.id = t.order_id
		where not o.is_test
			and t.created_at >= (${start}::timestamp at time zone ${SHOP_TZ})
			and t.created_at < ((${end}::timestamp + interval '1 day') at time zone ${SHOP_TZ})
		group by 1, 2 order by 1, 2`;
	return rows.map((r) => ({ method: r.method, status: r.status, count: r.n, amountCents: Number(r.amount) }));
}

/** Orders by local weekday (0 = Sunday) and hour. */
export async function peakHours(range: Range, filters: Filters = {}, sql: Db = db()) {
	const { start, end } = bounds(range);
	const channel = filters.channel || null;
	const rows = await sql<{ dow: number; hour: number; n: number }[]>`
		select extract(dow from created_at at time zone ${SHOP_TZ})::int as dow,
			extract(hour from created_at at time zone ${SHOP_TZ})::int as hour, count(*)::int as n
		from orders
		where not is_test and status not in ('cancelled','rejected')
			and created_at >= (${start}::timestamp at time zone ${SHOP_TZ})
			and created_at < ((${end}::timestamp + interval '1 day') at time zone ${SHOP_TZ})
			and (${channel}::text is null or channel = ${channel})
		group by 1, 2`;
	return rows;
}

export async function topProducts(range: Range, filters: Filters = {}, sql: Db = db()) {
	const { start, end } = bounds(range);
	const channel = filters.channel || null;
	const rows = await sql<{ sku: string; name: string; units: number; sales: number; orders: number }[]>`
		select i.product_sku as sku, max(i.product_name) as name, sum(i.quantity)::int as units,
			sum(i.line_total_cents)::bigint as sales, count(distinct i.order_id)::int as orders
		from order_items i join orders o on o.id = i.order_id
		where not o.is_test and o.status not in ('cancelled','rejected')
			and o.created_at >= (${start}::timestamp at time zone ${SHOP_TZ})
			and o.created_at < ((${end}::timestamp + interval '1 day') at time zone ${SHOP_TZ})
			and (${channel}::text is null or o.channel = ${channel})
		group by i.product_sku order by sales desc limit 50`;
	const mods = await sql<{ name: string; units: number; sales: number }[]>`
		select m.option_name as name, sum(m.quantity * i.quantity)::int as units,
			sum(m.quantity * i.quantity * m.unit_price_cents)::bigint as sales
		from order_item_modifiers m join order_items i on i.id = m.order_item_id join orders o on o.id = i.order_id
		where not o.is_test and o.status not in ('cancelled','rejected')
			and o.created_at >= (${start}::timestamp at time zone ${SHOP_TZ})
			and o.created_at < ((${end}::timestamp + interval '1 day') at time zone ${SHOP_TZ})
			and (${channel}::text is null or o.channel = ${channel})
		group by m.option_name order by units desc limit 20`;
	return {
		products: rows.map((r) => ({ ...r, salesCents: Number(r.sales) })),
		modifiers: mods.map((m) => ({ ...m, salesCents: Number(m.sales) }))
	};
}

/** Daily cash-up for reconciliation: what each order should have collected vs. what was recorded. */
export async function reconciliation(day: string, sql: Db = db()) {
	const r = { from: day, to: day };
	const { start, end } = bounds(r);
	const byMethod = await collectedByMethod(r, sql);
	const issues = await sql<
		{ id: string; order_number: number; channel: string; status: string; payment_status: string; total_cents: number; paid: number }[]
	>`
		select o.id, o.order_number, o.channel, o.status, o.payment_status, o.total_cents,
			coalesce(sum(t.amount_cents) filter (where t.status = 'paid'), 0)::int as paid
		from orders o left join tenders t on t.order_id = o.id
		where not o.is_test
			and o.created_at >= (${start}::timestamp at time zone ${SHOP_TZ})
			and o.created_at < ((${end}::timestamp + interval '1 day') at time zone ${SHOP_TZ})
			and o.channel <> 'ifood'
		group by o.id
		having (o.status not in ('cancelled','rejected') and coalesce(sum(t.amount_cents) filter (where t.status = 'paid'), 0) <> o.total_cents)
			or (o.status in ('cancelled','rejected') and coalesce(sum(t.amount_cents) filter (where t.status = 'paid'), 0) > 0)
			or o.payment_status in ('unknown','failed')
		order by o.order_number`;
	const [ifood] = await sql<{ n: number; amount: number }[]>`
		select count(*)::int as n, coalesce(sum(total_cents), 0)::bigint as amount from orders
		where channel = 'ifood' and not is_test and status not in ('cancelled','rejected')
			and created_at >= (${start}::timestamp at time zone ${SHOP_TZ})
			and created_at < ((${end}::timestamp + interval '1 day') at time zone ${SHOP_TZ})`;
	return {
		byMethod,
		issues: issues.map((i) => ({
			id: i.id,
			orderNumber: i.order_number,
			channel: i.channel,
			status: i.status,
			paymentStatus: i.payment_status,
			totalCents: i.total_cents,
			paidCents: i.paid
		})),
		ifood: { count: ifood.n, amountCents: Number(ifood.amount) }
	};
}
