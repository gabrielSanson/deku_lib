// The owner's daily summary, 30 minutes after closing (23:30 without opening hours): sales,
// orders, average ticket, channels, top products, cash difference, unpaid and cancelled orders
// and open alerts. E-mail to the alert recipients; WhatsApp to the owner when set up
// ([UNVERIFIED] TODO(verify): the 'resumo_diario' utility template must be approved by Meta).
import { dayBefore, shopTime, summaryDueAt } from '#lib/domain/hours.ts';
import { formatBRL } from '#lib/domain/money.ts';
import { fill } from '#lib/texts/catalog.ts';
import { db, type Db } from '../db';
import { queueMessage } from '../messaging/outbox';
import { getSchedule } from '../settings/hours';
import { getStoreProfile } from '../settings/profile';
import { getTexts } from '../settings/texts';
import { whatsappEnabled } from '../whatsapp/settings';
import { getAlertSettings } from './service';
import { SHOP_TZ } from '../analytics/queries';

export const SUMMARY_TEMPLATE = 'resumo_diario';

const localDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TZ }).format(d);

export interface DailySummary {
	day: string;
	grossCents: number;
	orders: number;
	averageCents: number;
	channels: { channel: string; orders: number; grossCents: number }[];
	top: { name: string; units: number }[];
	cashDifferenceCents: number | null;
	unpaid: number;
	cancelled: number;
	openAlerts: number;
}

/** The day's figures, from 04:00 that day to the summary time (a late shift is included). */
export async function buildDailySummary(day: string, until: Date, sql: Db = db()) {
	const from = shopTime(day, '04:00');
	const [s] = await sql<{ gross: number; orders: number; unpaid: number; cancelled: number }[]>`
		select coalesce(sum(subtotal_cents + delivery_fee_cents - discount_cents)
				filter (where status not in ('cancelled', 'rejected')), 0)::int as gross,
			count(*) filter (where status not in ('cancelled', 'rejected'))::int as orders,
			count(*) filter (where status not in ('cancelled', 'rejected')
				and payment_status in ('pending', 'unknown'))::int as unpaid,
			count(*) filter (where status in ('cancelled', 'rejected'))::int as cancelled
		from orders where not is_test and created_at >= ${from} and created_at < ${until}`;
	const channels = await sql<{ channel: string; orders: number; grossCents: number }[]>`
		select channel, count(*)::int as orders,
			sum(subtotal_cents + delivery_fee_cents - discount_cents)::int as "grossCents"
		from orders where not is_test and status not in ('cancelled', 'rejected')
			and created_at >= ${from} and created_at < ${until}
		group by channel order by 3 desc`;
	const top = await sql<{ name: string; units: number }[]>`
		select max(i.product_name) as name, sum(i.quantity)::int as units
		from order_items i join orders o on o.id = i.order_id
		where not o.is_test and o.status not in ('cancelled', 'rejected')
			and o.created_at >= ${from} and o.created_at < ${until}
		group by i.product_sku order by units desc limit 3`;
	const [cash] = await sql<{ diff: number | null }[]>`
		select sum(difference_cents)::int as diff from cash_sessions
		where status = 'closed' and closed_at >= ${from} and closed_at < ${until}`;
	const [alerts] = await sql<{ n: number }[]>`
		select count(*)::int as n from alerts where resolved_at is null`;
	return {
		day,
		grossCents: s.gross,
		orders: s.orders,
		averageCents: s.orders ? Math.round(s.gross / s.orders) : 0,
		channels,
		top,
		cashDifferenceCents: cash?.diff ?? null,
		unpaid: s.unpaid,
		cancelled: s.cancelled,
		openAlerts: alerts?.n ?? 0
	} satisfies DailySummary;
}

const CHANNEL_NAME: Record<string, string> = {
	counter: 'Balcão',
	web: 'Site',
	ifood: 'iFood',
	opendelivery: '99Food/Keeta'
};

/** The e-mail text, from the owner-editable texts. */
export function summaryText(s: DailySummary, texts: Record<string, string>, shop: string) {
	const [y, m, d] = s.day.split('-');
	const lines = [
		fill(texts['summary.line.sales'], {
			value: formatBRL(s.grossCents),
			n: s.orders,
			avg: formatBRL(s.averageCents)
		}),
		...s.channels.map(
			(c) => `• ${CHANNEL_NAME[c.channel] ?? c.channel}: ${c.orders} · ${formatBRL(c.grossCents)}`
		),
		s.top.length
			? fill(texts['summary.line.top'], {
					list: s.top.map((p) => `${p.name} (${p.units})`).join(', ')
				})
			: '',
		s.cashDifferenceCents != null
			? fill(texts['summary.line.cash'], { value: formatBRL(s.cashDifferenceCents) })
			: '',
		fill(texts['summary.line.problems'], {
			unpaid: s.unpaid,
			cancelled: s.cancelled,
			alerts: s.openAlerts
		})
	].filter(Boolean);
	return {
		subject: fill(texts['summary.subject'], { loja: shop, data: `${d}/${m}/${y}` }),
		body: lines.join('\n')
	};
}

/**
 * Every 15 minutes: sends the summary of the opening day whose time has come, once. Days more
 * than six hours late are skipped (the worker was down), so an old summary never arrives.
 */
export async function dailySummaryTick(now = new Date()) {
	const settings = await getAlertSettings();
	if (!settings.dailySummaryEnabled) return 'off';
	const schedule = await getSchedule();
	const today = localDate(now);
	for (const day of [dayBefore(today), today]) {
		const due = summaryDueAt(schedule, day);
		if (now < due || now.getTime() - due.getTime() > 6 * 3600_000) continue;
		return db().begin(async (tx) => {
			const [claimed] = await tx<{ day: string }[]>`
				insert into daily_summaries (day) values (${day}) on conflict do nothing returning day`;
			if (!claimed) return 'already';
			const summary = await buildDailySummary(day, due, tx);
			await tx`update daily_summaries set detail = ${tx.json(summary as never)}
				where shop_id = current_shop_id() and day = ${day}`;
			const texts = await getTexts(tx);
			const shop = (await getStoreProfile(tx)).displayName;
			const { subject, body } = summaryText(summary, texts, shop);
			for (const to of settings.emailTo)
				await queueMessage(tx, {
					channel: 'email',
					to,
					template: '_text',
					vars: { subject, body }
				});
			if (settings.ownerWhatsapp && (await whatsappEnabled()))
				await queueMessage(tx, {
					channel: 'whatsapp',
					to: settings.ownerWhatsapp,
					template: SUMMARY_TEMPLATE,
					vars: {
						loja: shop,
						vendas: formatBRL(summary.grossCents),
						pedidos: String(summary.orders),
						ticket: formatBRL(summary.averageCents)
					}
				});
			return 'sent';
		});
	}
	return 'not-due';
}
