// Clientes: the shop's contact list with its order totals, filters and CSV export. Marketing
// exports only ever contain contacts who may be marketed to (mayMarket).
import { mayMarket, mayMarketSql, type CustomerSource } from '#lib/domain/consent.ts';
import { db } from '../db';

export type CustomerFilter = 'all' | 'inactive' | 'frequent' | 'new';

export interface CustomerRow {
	id: string;
	name: string | null;
	phone: string | null;
	email: string | null;
	source: CustomerSource;
	ordersCount: number;
	totalSpentCents: number;
	lastOrderAt: Date | null;
	firstOrderAt: Date | null;
	mayMarket: boolean;
}

interface Row {
	id: string;
	name: string | null;
	phone_e164: string | null;
	contact_phone_e164: string | null;
	email: string | null;
	source: CustomerSource;
	orders_count: number;
	total_spent_cents: string | number;
	last_order_at: Date | null;
	first_order_at: Date | null;
	marketing_consent_at: Date | null;
	marketing_opt_out_at: Date | null;
	deleted_at: Date | null;
}

/** "Frequent": this many orders or more. */
export const FREQUENT_ORDERS = 5;

function toRow(r: Row): CustomerRow {
	return {
		id: r.id,
		name: r.name,
		phone: r.phone_e164 ?? r.contact_phone_e164,
		email: r.email,
		source: r.source,
		ordersCount: r.orders_count,
		totalSpentCents: Number(r.total_spent_cents),
		lastOrderAt: r.last_order_at,
		firstOrderAt: r.first_order_at,
		mayMarket: mayMarket({
			source: r.source,
			marketingConsentAt: r.marketing_consent_at,
			marketingOptOutAt: r.marketing_opt_out_at,
			deletedAt: r.deleted_at
		})
	};
}

export interface CustomerQuery {
	q?: string;
	filter?: CustomerFilter;
	source?: CustomerSource | '';
	/** Only contacts who may receive marketing. */
	marketable?: boolean;
	limit?: number;
}

export async function listCustomers(query: CustomerQuery = {}): Promise<CustomerRow[]> {
	const sql = db();
	const q = query.q?.trim().toLowerCase() ?? '';
	const digits = q.replace(/\D/g, '');
	const filter = query.filter ?? 'all';
	const rows = await sql<Row[]>`
		select c.id, c.name, c.phone_e164, c.contact_phone_e164, c.email, c.source, c.orders_count,
			c.total_spent_cents, c.last_order_at, c.first_order_at, c.marketing_consent_at,
			c.marketing_opt_out_at, c.deleted_at
		from customers c
		where c.deleted_at is null
			and (${q} = '' or lower(coalesce(c.name, '')) like ${'%' + q + '%'}
				or lower(coalesce(c.email, '')) like ${'%' + q + '%'}
				or (${digits} <> '' and coalesce(c.phone_e164, c.contact_phone_e164, '') like ${'%' + digits + '%'}))
			and (${query.source ?? ''} = '' or c.source = ${query.source ?? ''})
			and (${filter} <> 'inactive' or (c.last_order_at is not null and c.last_order_at < now() - interval '30 days'))
			and (${filter} <> 'frequent' or c.orders_count >= ${FREQUENT_ORDERS})
			and (${filter} <> 'new' or c.first_order_at >= now() - interval '30 days')
			and (${!query.marketable} or ${sql.unsafe(mayMarketSql('c'))})
		order by c.last_order_at desc nulls last, c.created_at desc
		limit ${query.limit ?? 200}`;
	return rows.map(toRow);
}

export async function countCustomers(query: CustomerQuery = {}): Promise<number> {
	return (await listCustomers({ ...query, limit: 100_000 })).length;
}

export async function customerDetail(id: string) {
	const sql = db();
	const [r] = await sql<(Row & { birthday: string | null; whatsapp_updates_at: Date | null })[]>`
		select * from customers where id = ${id} and deleted_at is null`;
	if (!r) return null;
	const orders = await sql<
		{
			id: string;
			order_number: number;
			channel: string;
			status: string;
			total_cents: number;
			created_at: Date;
		}[]
	>`select id, order_number, channel, status, total_cents, created_at from orders
		where customer_id = ${id} order by created_at desc limit 50`;
	return {
		...toRow(r),
		birthday: r.birthday,
		marketingConsentAt: r.marketing_consent_at,
		marketingOptOutAt: r.marketing_opt_out_at,
		orders: orders.map((o) => ({
			id: o.id,
			orderNumber: o.order_number,
			channel: o.channel,
			status: o.status,
			totalCents: o.total_cents,
			createdAt: o.created_at
		}))
	};
}

function csvCell(v: unknown): string {
	const s = v === null || v === undefined ? '' : String(v);
	return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV for Excel (semicolon, BOM). "marketing": only contacts who may be marketed to, with phone
 * and e-mail. "delivery": every contact, without phone or e-mail.
 */
export async function customersCsv(purpose: 'marketing' | 'delivery', query: CustomerQuery = {}) {
	const rows = await listCustomers({
		...query,
		marketable: purpose === 'marketing',
		limit: 100_000
	});
	const head =
		purpose === 'marketing'
			? ['nome', 'telefone', 'email', 'pedidos', 'total_gasto', 'ultimo_pedido', 'origem']
			: ['nome', 'pedidos', 'total_gasto', 'ultimo_pedido', 'origem'];
	const lines = rows.map((r) => {
		const base = [
			r.ordersCount,
			(r.totalSpentCents / 100).toFixed(2).replace('.', ','),
			r.lastOrderAt ? r.lastOrderAt.toISOString().slice(0, 10) : '',
			r.source
		];
		return (purpose === 'marketing' ? [r.name, r.phone, r.email, ...base] : [r.name, ...base])
			.map(csvCell)
			.join(';');
	});
	return '﻿' + [head.join(';'), ...lines].join('\r\n') + '\r\n';
}
