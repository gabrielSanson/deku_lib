// iFood payout check (Relatórios → Repasses iFood): store a statement, match each line to an
// order, and show what iFood kept, what it paid, and what does not add up.
import { audit, type Actor } from '../../audit';
import { db } from '../../db';
import { DomainError } from '../../errors';
import { parsePayoutCsv, type PayoutField } from './payout-csv';

export async function payoutColumns(): Promise<Partial<Record<PayoutField, string[]>>> {
	const [r] = await db()<{ ifood_payout_columns: Partial<Record<PayoutField, string[]>> | null }[]>`
		select ifood_payout_columns from channel_settings where shop_id = current_shop_id()`;
	return r?.ifood_payout_columns ?? {};
}

export async function savePayoutColumns(
	columns: Partial<Record<PayoutField, string[]>>,
	actor: Actor
) {
	await db()`
		insert into channel_settings (ifood_payout_columns) values (${db().json(columns)})
		on conflict (shop_id) do update set ifood_payout_columns = excluded.ifood_payout_columns, updated_at = now()`;
	await audit(db(), actor, 'payouts.columns_saved', 'channel_settings', null, columns);
}

export async function importIfoodPayouts(csv: string, filename: string | null, actor: Actor) {
	const parsed = parsePayoutCsv(csv, await payoutColumns());
	if (parsed.problem) {
		throw new DomainError('err.payouts.columns', {
			code: parsed.problem,
			vars: { missing: parsed.missing.join(', ') || '-' }
		});
	}
	return db().begin(async (tx) => {
		const dates = parsed.rows
			.map((r) => r.date)
			.filter((d): d is string => Boolean(d))
			.sort();
		const [upload] = await tx<{ id: string }[]>`
			insert into channel_payout_uploads (channel, filename, period_start, period_end, rows, uploaded_by)
			values ('ifood', ${filename}, ${dates[0] ?? null}, ${dates.at(-1) ?? null}, ${parsed.rows.length}, ${actor.id})
			returning id`;
		let matched = 0;
		for (const r of parsed.rows) {
			const [order] = r.orderRef
				? await tx<{ id: string }[]>`
						select id from orders where channel = 'ifood'
							and (channel_order_id = ${r.orderRef} or channel_display_id = ${r.orderRef})
						order by created_at desc limit 1`
				: [];
			if (order) matched++;
			await tx`
				insert into channel_payouts (upload_id, channel, period, order_id, channel_order_ref, occurred_on,
					gross_cents, commission_cents, fee_cents, net_cents, raw)
				values (${upload.id}, 'ifood', ${r.date?.slice(0, 7) ?? null}, ${order?.id ?? null}, ${r.orderRef},
					${r.date}, ${r.grossCents}, ${r.commissionCents}, ${r.feeCents}, ${r.netCents}, ${tx.json(r.raw)})`;
		}
		await audit(tx, actor, 'payouts.imported', 'channel_payout_upload', upload.id, {
			rows: parsed.rows.length,
			matched
		});
		return { uploadId: upload.id, rows: parsed.rows.length, matched };
	});
}

export async function payoutUploads() {
	return db()<
		{
			id: string;
			filename: string | null;
			period_start: string | null;
			period_end: string | null;
			rows: number;
			created_at: Date;
		}[]
	>`select id, filename, period_start::text, period_end::text, rows, created_at
		from channel_payout_uploads where channel = 'ifood' order by created_at desc limit 20`;
}

export async function payoutReport(uploadId: string) {
	const sql = db();
	const [upload] = await sql<
		{
			id: string;
			period_start: string | null;
			period_end: string | null;
			filename: string | null;
		}[]
	>`select id, period_start::text, period_end::text, filename from channel_payout_uploads where id = ${uploadId}`;
	if (!upload) return null;
	const lines = await sql<
		{
			id: string;
			order_id: string | null;
			order_number: number | null;
			channel_order_ref: string | null;
			occurred_on: string | null;
			order_total_cents: number | null;
			gross_cents: number;
			commission_cents: number;
			fee_cents: number;
			net_cents: number;
		}[]
	>`select p.id, p.order_id, o.order_number, p.channel_order_ref, p.occurred_on::text,
			o.total_cents as order_total_cents, p.gross_cents, p.commission_cents, p.fee_cents, p.net_cents
		from channel_payouts p left join orders o on o.id = p.order_id
		where p.upload_id = ${uploadId} order by p.occurred_on nulls last, p.channel_order_ref`;
	// iFood orders in the statement's days that the statement does not list.
	const range = await sql<{ start: Date | null; end: Date | null }[]>`
		select coalesce(${upload.period_start}::date, min(o.created_at)::date) as start,
			coalesce(${upload.period_end}::date, max(o.created_at)::date) as end
		from channel_payouts p join orders o on o.id = p.order_id where p.upload_id = ${uploadId}`;
	const { start, end } = range[0] ?? { start: null, end: null };
	const missing =
		start && end
			? await sql<
					{
						id: string;
						order_number: number;
						channel_display_id: string | null;
						total_cents: number;
						created_at: Date;
					}[]
				>`
					select o.id, o.order_number, o.channel_display_id, o.total_cents, o.created_at from orders o
					where o.channel = 'ifood' and not o.is_test and o.status = 'completed'
						and (o.created_at at time zone 'America/Sao_Paulo')::date between ${start} and ${end}
						and not exists (select 1 from channel_payouts p where p.upload_id = ${uploadId} and p.order_id = o.id)
					order by o.created_at`
			: [];
	const matched = lines.filter((l) => l.order_id);
	const sum = (
		xs: typeof lines,
		k: 'gross_cents' | 'commission_cents' | 'fee_cents' | 'net_cents'
	) => xs.reduce((n, x) => n + x[k], 0);
	return {
		upload,
		totals: {
			expectedCents: matched.reduce((n, l) => n + (l.order_total_cents ?? 0), 0),
			grossCents: sum(lines, 'gross_cents'),
			commissionCents: sum(lines, 'commission_cents'),
			feeCents: sum(lines, 'fee_cents'),
			netCents: sum(lines, 'net_cents')
		},
		matched,
		/** Statement lines that match no order of ours. */
		unknown: lines.filter((l) => !l.order_id),
		/** Our iFood orders in the period that the statement leaves out. */
		missing
	};
}
