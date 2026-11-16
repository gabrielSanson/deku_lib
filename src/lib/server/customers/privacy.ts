// "Meus dados" (LGPD): access and deletion requests. A signed-in customer asks from /conta/dados;
// anyone can ask from /privacidade/solicitar and confirm with a code sent to their e-mail. Staff
// answer in Clientes → Solicitações: an access request gets a JSON export, a deletion anonymises
// the customer and keeps the orders (fiscal records) under "Cliente removido".
import { createHash, randomInt } from 'node:crypto';
import { fill } from '#lib/texts/catalog.ts';
import { audit, type Actor } from '../audit';
import { db, type Tx } from '../db';
import { DomainError } from '../errors';
import { queueMessage } from '../messaging/outbox';
import { getTexts } from '../settings/texts';

export type PrivacyKind = 'access' | 'delete';
export const REMOVED_LABEL = 'Cliente removido';

const hash = (code: string) => createHash('sha256').update(code).digest('hex');

async function dueDays(tx: Tx) {
	const [r] = await tx<{ privacy_due_days: number }[]>`
		select privacy_due_days from store_runtime_settings where shop_id = current_shop_id()`;
	return r?.privacy_due_days ?? 30;
}

/** A signed-in customer's request: confirmed at once. */
export async function requestAsCustomer(customerId: string, kind: PrivacyKind) {
	return db().begin(async (tx) => {
		const [open] = await tx<{ id: string }[]>`
			select id from privacy_requests where customer_id = ${customerId} and kind = ${kind}
			and status = 'pending'`;
		if (open) return open.id;
		const days = await dueDays(tx);
		const [r] = await tx<{ id: string }[]>`
			insert into privacy_requests (customer_id, kind, status, due_at)
			values (${customerId}, ${kind}, 'pending', now() + make_interval(days => ${days}))
			returning id`;
		await audit(
			tx,
			{ type: 'customer', id: customerId },
			`privacy.${kind}_requested`,
			'privacy_request',
			r.id,
			{}
		);
		return r.id;
	});
}

/** The public form: sends a 6-digit code to the e-mail; the request waits for it. */
export async function requestByEmail(email: string, kind: PrivacyKind) {
	const address = email.trim().toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new DomainError('err.privacy.email');
	const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
	return db().begin(async (tx) => {
		const [r] = await tx<{ id: string }[]>`
			insert into privacy_requests (email, kind, confirm_code_hash)
			values (${address}, ${kind}, ${hash(code)}) returning id`;
		const texts = await getTexts(tx);
		await queueMessage(tx, {
			channel: 'email',
			to: address,
			template: '_text',
			vars: {
				subject: texts['privacy.mail.subject'],
				body: fill(texts['privacy.mail.body'], { code })
			}
		});
		return { id: r.id, code };
	});
}

export async function confirmByEmail(id: string, code: string) {
	// The wrong-code count must survive the error, so the transaction commits and we throw after.
	const ok = await db().begin(async (tx) => {
		const [r] = await tx<
			{
				email: string;
				confirm_code_hash: string | null;
				confirm_attempts: number;
				status: string;
			}[]
		>`select email, confirm_code_hash, confirm_attempts, status from privacy_requests
			where id = ${id} for update`;
		if (!r || r.status !== 'unconfirmed' || r.confirm_attempts >= 5)
			throw new DomainError('err.privacy.code');
		if (r.confirm_code_hash !== hash(code.trim())) {
			await tx`update privacy_requests set confirm_attempts = confirm_attempts + 1 where id = ${id}`;
			return false;
		}
		const [c] = await tx<{ id: string }[]>`
			select id from customers where lower(email) = ${r.email} and deleted_at is null
			order by created_at limit 1`;
		const days = await dueDays(tx);
		await tx`update privacy_requests set status = 'pending', confirm_code_hash = null,
			customer_id = ${c?.id ?? null}, due_at = now() + make_interval(days => ${days})
			where id = ${id}`;
		await audit(
			tx,
			{ type: 'customer', id: c?.id ?? null },
			'privacy.confirmed',
			'privacy_request',
			id,
			{}
		);
		return true;
	});
	if (!ok) throw new DomainError('err.privacy.code');
}

export async function listPrivacyRequests() {
	return db()<
		{
			id: string;
			kind: PrivacyKind;
			status: string;
			customer_id: string | null;
			name: string | null;
			email: string | null;
			requested_at: Date;
			due_at: Date | null;
			answered_at: Date | null;
			note: string | null;
		}[]
	>`
		select r.id, r.kind, r.status, r.customer_id, c.name, coalesce(r.email, c.email) as email,
			r.requested_at, r.due_at, r.answered_at, r.note
		from privacy_requests r left join customers c on c.id = r.customer_id
		where r.status <> 'unconfirmed'
		order by (r.status = 'pending') desc, r.due_at nulls last, r.requested_at desc limit 100`;
}

/** Everything the shop keeps about the customer, as JSON. */
export async function exportCustomerData(customerId: string) {
	const sql = db();
	const [customer] = await sql`
		select name, phone_e164, contact_phone_e164, email, birthday, source, created_at,
			marketing_consent_at, marketing_opt_out_at, whatsapp_updates_at, orders_count, total_spent_cents
		from customers where id = ${customerId}`;
	if (!customer) throw new DomainError('err.privacy.noCustomer');
	const orders = await sql`
		select o.order_number, o.created_at, o.channel, o.status, o.total_cents, o.fulfillment_type,
			coalesce((select json_agg(json_build_object('item', i.product_name, 'quantity', i.quantity))
				from order_items i where i.order_id = o.id), '[]') as items,
			(select row_to_json(a) from (select street, number, complement, neighborhood, city, state, cep
				from order_addresses where order_id = o.id) a) as address
		from orders o where o.customer_id = ${customerId} order by o.created_at`;
	return { exportedAt: new Date().toISOString(), customer, orders };
}

/** Deletion: the person's details go; orders stay for the fiscal records, unnamed. */
export async function anonymiseCustomer(tx: Tx, customerId: string) {
	await tx`update customers set name = null, phone_e164 = null, contact_phone_e164 = null, email = null,
		birthday = null, auth_user_id = null, marketing_consent_at = null, whatsapp_updates_at = null,
		marketing_opt_out_at = coalesce(marketing_opt_out_at, now()), deleted_at = now()
		where id = ${customerId}`;
	await tx`update orders set customer_label = ${REMOVED_LABEL}, notes = null where customer_id = ${customerId}`;
	await tx`update order_addresses a set recipient = ${REMOVED_LABEL}, street = '—', number = '—',
		complement = null, instructions = null
		from orders o where o.id = a.order_id and o.customer_id = ${customerId}`;
	await tx`update coupons set active = false where customer_id = ${customerId}`;
}

export async function answerRequest(
	id: string,
	outcome: 'done' | 'refused',
	actor: Actor,
	note?: string | null
) {
	return db().begin(async (tx) => {
		const [r] = await tx<{ kind: PrivacyKind; status: string; customer_id: string | null }[]>`
			select kind, status, customer_id from privacy_requests where id = ${id} for update`;
		if (!r || r.status !== 'pending') throw new DomainError('err.privacy.notPending');
		if (outcome === 'done' && r.kind === 'delete' && r.customer_id)
			await anonymiseCustomer(tx, r.customer_id);
		await tx`update privacy_requests set status = ${outcome}, answered_at = now(),
			answered_by = ${actor.id}, note = ${note ?? null} where id = ${id}`;
		await audit(tx, actor, `privacy.${r.kind}_${outcome}`, 'privacy_request', id, {
			customerId: r.customer_id
		});
	});
}
