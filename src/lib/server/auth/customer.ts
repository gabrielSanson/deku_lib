// Customer accounts. A Supabase sign-in is linked to one row in `customers`. Past guest
// orders join that row only when the sign-in's e-mail is verified and matches the e-mail on
// the guest record; a phone number never links anything, because anyone can type one.
import type { User } from '@supabase/supabase-js';
import type { OrderStatus } from '#lib/domain/order-status.ts';
import type { PastItem } from '#lib/domain/reorder.ts';
import { normalizeBrPhone } from '#lib/domain/phone.ts';
import { audit } from '../audit';
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
		{ id: string; name: string | null; phone: string | null; email: string | null }[]
	>`select id, name, coalesce(phone_e164, contact_phone_e164) as phone, email from customers
		where auth_user_id = ${userId} and deleted_at is null`;
	return row ? { id: row.id, name: row.name, phone: row.phone, email: row.email } : null;
}

/** Supabase sets email_confirmed_at once the link was opened, or when Google vouches for it. */
function verifiedEmail(user: User): string | null {
	return user.email && user.email_confirmed_at ? user.email.trim() : null;
}

/**
 * Makes sure a signed-in user has a customer record. Name and phone come from the
 * sign-up form (kept in the user's metadata) so the link also works when the
 * e-mail was confirmed later.
 */
export async function ensureCustomer(user: User): Promise<CustomerSession> {
	const meta = (user.user_metadata ?? {}) as { name?: string; full_name?: string; phone?: string };
	const name = (meta.name ?? meta.full_name ?? '').trim() || null;
	const email = user.email ?? null;
	const verified = verifiedEmail(user);
	const phoneE164 = meta.phone ? normalizeBrPhone(meta.phone) : null;

	return db().begin(async (tx) => {
		const [mine] = await tx<{ id: string }[]>`
			select id from customers where auth_user_id = ${user.id} and deleted_at is null for update`;
		// A guest record with the same verified e-mail. The row lock stops two accounts taking it.
		const [guest] = verified
			? await tx<{ id: string }[]>`
				select id from customers
				where lower(email) = lower(${verified}) and auth_user_id is null and deleted_at is null
				order by created_at limit 1
				for update skip locked`
			: [];

		if (mine) {
			// The account existed before the e-mail was verified: bring the guest orders over.
			if (guest) await mergeGuest(tx, guest.id, mine.id, user.id);
			return (await loadCustomerTx(tx, mine.id))!;
		}
		if (guest) {
			await tx`
				update customers set auth_user_id = ${user.id}, name = coalesce(name, ${name})
				where id = ${guest.id}`;
			await audit(tx, { type: 'customer', id: guest.id }, 'customer.linked', 'customer', guest.id, {
				via: 'email'
			});
			return (await loadCustomerTx(tx, guest.id))!;
		}
		// A number already on another record stays only as a contact number.
		const phoneFree = phoneE164 ? !(await phoneTaken(tx, phoneE164)) : false;
		const [row] = await tx<{ id: string }[]>`
			insert into customers (name, phone_e164, contact_phone_e164, email, auth_user_id)
			values (${name}, ${phoneFree ? phoneE164 : null}, ${phoneFree ? null : phoneE164}, ${email},
				${user.id})
			returning id`;
		return (await loadCustomerTx(tx, row.id))!;
	});
}

async function loadCustomerTx(tx: Tx, id: string): Promise<CustomerSession | null> {
	const [row] = await tx<
		{ id: string; name: string | null; phone: string | null; email: string | null }[]
	>`select id, name, coalesce(phone_e164, contact_phone_e164) as phone, email from customers
		where id = ${id}`;
	return row ?? null;
}

/** Moves a guest record's orders onto the account with the same verified e-mail. */
async function mergeGuest(tx: Tx, guestId: string, accountId: string, userId: string) {
	await tx`update orders set customer_id = ${accountId} where customer_id = ${guestId}`;
	const [g] = await tx<{ phone_e164: string | null; name: string | null }[]>`
		update customers set deleted_at = now() where id = ${guestId}
		returning phone_e164, name`;
	await tx`
		update customers set
			phone_e164 = coalesce(phone_e164, ${g.phone_e164}),
			contact_phone_e164 = case when phone_e164 is null and ${g.phone_e164}::text is not null
				then null else contact_phone_e164 end,
			name = coalesce(name, ${g.name})
		where id = ${accountId}`;
	await audit(tx, { type: 'customer', id: accountId }, 'customer.linked', 'customer', accountId, {
		via: 'email',
		merged: guestId,
		authUserId: userId
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
	await db()`update customers set name = ${input.name}, phone_e164 = ${input.phoneE164},
			contact_phone_e164 = null
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

/** What was in each order, for "Pedir de novo". */
export async function orderItems(orderIds: string[]): Promise<Map<string, PastItem[]>> {
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
				'optionName', m.option_name, 'quantity', m.quantity, 'kind', m.kind) order by m.id)
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
