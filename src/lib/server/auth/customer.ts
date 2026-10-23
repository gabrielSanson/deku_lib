// Customer accounts. A Supabase sign-in is linked to one row in `customers`; past
// guest orders live on that row, so a customer who signs up with the phone they
// ordered with keeps their history.
import type { User } from '@supabase/supabase-js';
import type { OrderStatus } from '#lib/domain/order-status.ts';
import type { PastItem } from '#lib/domain/reorder.ts';
import { normalizeBrPhone } from '#lib/domain/phone.ts';
import { db, type Tx } from '../db';
import { DomainError } from '../errors';

export interface CustomerSession {
	id: string;
	name: string | null;
	phone: string | null;
	email: string | null;
}

export interface CustomerOrder {
	orderNumber: number;
	status: OrderStatus;
	fulfillmentType: string;
	totalCents: number;
	publicToken: string;
	createdAt: string;
	/** What was ordered, for "Pedir de novo". */
	items: PastItem[];
}

export async function loadCustomer(userId: string): Promise<CustomerSession | null> {
	const [row] = await db()<
		{ id: string; name: string | null; phone_e164: string | null; email: string | null }[]
	>`select id, name, phone_e164, email from customers
		where auth_user_id = ${userId} and deleted_at is null`;
	return row ? { id: row.id, name: row.name, phone: row.phone_e164, email: row.email } : null;
}

/**
 * Makes sure a signed-in user has a customer record. Name and phone come from the
 * sign-up form (kept in the user's metadata) so the link also works when the
 * e-mail was confirmed later.
 */
export async function ensureCustomer(user: User): Promise<CustomerSession> {
	const existing = await loadCustomer(user.id);
	if (existing) return existing;
	const meta = (user.user_metadata ?? {}) as { name?: string; full_name?: string; phone?: string };
	const name = (meta.name ?? meta.full_name ?? '').trim() || null;
	const email = user.email ?? null;
	const phoneE164 = meta.phone ? normalizeBrPhone(meta.phone) : null;

	return db().begin(async (tx) => {
		if (phoneE164) {
			const [same] = await tx<{ id: string; auth_user_id: string | null }[]>`
				select id, auth_user_id from customers
				where phone_e164 = ${phoneE164} and deleted_at is null for update`;
			if (same && !same.auth_user_id) {
				const [row] = await tx<{ id: string; name: string | null; email: string | null }[]>`
					update customers set auth_user_id = ${user.id},
						name = coalesce(name, ${name}), email = coalesce(email, ${email})
					where id = ${same.id}
					returning id, name, email`;
				return { id: row.id, name: row.name, phone: phoneE164, email: row.email };
			}
		}
		// The number is already on another account: keep the new one without a phone.
		const phoneFree = phoneE164 && !(await phoneTaken(tx, phoneE164));
		const [row] = await tx<{ id: string; name: string | null; email: string | null }[]>`
			insert into customers (name, phone_e164, email, auth_user_id)
			values (${name}, ${phoneFree ? phoneE164 : null}, ${email}, ${user.id})
			returning id, name, email`;
		return {
			id: row.id,
			name: row.name,
			phone: phoneFree ? phoneE164 : null,
			email: row.email
		};
	});
}

async function phoneTaken(tx: Tx, phoneE164: string) {
	const [row] =
		await tx`select 1 from customers where phone_e164 = ${phoneE164} and deleted_at is null`;
	return Boolean(row);
}

/** Changes the name and phone on the customer record. */
export async function updateCustomerProfile(
	customerId: string,
	input: { name: string; phoneE164: string | null }
) {
	if (input.phoneE164) {
		const [row] = await db()`select 1 from customers
			where phone_e164 = ${input.phoneE164} and id <> ${customerId} and deleted_at is null`;
		if (row)
			throw new DomainError('account.error.phoneTaken', { code: 'phone_taken', status: 409 });
	}
	await db()`update customers set name = ${input.name}, phone_e164 = ${input.phoneE164}
		where id = ${customerId}`;
}

export async function customerOrders(customerId: string, limit = 20): Promise<CustomerOrder[]> {
	const rows = await db()<
		{
			id: string;
			order_number: number;
			status: string;
			fulfillment_type: string;
			total_cents: number;
			public_token: string;
			created_at: Date;
		}[]
	>`select id, order_number, status, fulfillment_type, total_cents, public_token, created_at
		from orders where customer_id = ${customerId}
		order by created_at desc limit ${limit}`;
	const items = rows.length ? await orderItems(rows.map((r) => r.id)) : new Map();
	return rows.map((r) => ({
		orderNumber: r.order_number,
		status: r.status as OrderStatus,
		fulfillmentType: r.fulfillment_type,
		totalCents: r.total_cents,
		publicToken: r.public_token,
		createdAt: new Date(r.created_at).toISOString(),
		items: items.get(r.id) ?? []
	}));
}

async function orderItems(orderIds: string[]): Promise<Map<string, PastItem[]>> {
	const rows = await db()<
		{
			id: string;
			order_id: string;
			product_sku: string;
			product_name: string;
			quantity: number;
			note: string | null;
			modifiers: PastItem['modifiers'];
		}[]
	>`select i.id, i.order_id, i.product_sku, i.product_name, i.quantity, i.note,
			coalesce(json_agg(json_build_object('groupName', m.group_name, 'optionSku', m.option_sku,
				'optionName', m.option_name, 'quantity', m.quantity) order by m.id)
				filter (where m.id is not null), '[]') as modifiers
		from order_items i left join order_item_modifiers m on m.order_item_id = i.id
		where i.order_id = any(${orderIds}::uuid[])
		group by i.id order by i.position`;
	const byOrder = new Map<string, PastItem[]>();
	for (const r of rows) {
		const list = byOrder.get(r.order_id) ?? [];
		list.push({
			sku: r.product_sku,
			name: r.product_name,
			quantity: r.quantity,
			note: r.note,
			modifiers: r.modifiers
		});
		byOrder.set(r.order_id, list);
	}
	return byOrder;
}
