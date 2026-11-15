import { randomUUID } from 'node:crypto';
import type { User } from '@supabase/supabase-js';
import { afterAll, describe, expect, it } from 'vitest';
import { customerOrders, ensureCustomer } from '#lib/server/auth/customer.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

async function authUser(email: string, opts: { verified: boolean; phone?: string; name?: string }) {
	const [u] = await db()<{ id: string }[]>`
		insert into auth.users (email) values (${`${randomUUID()}@auth.local`}) returning id`;
	return {
		id: u.id,
		email,
		email_confirmed_at: opts.verified ? new Date().toISOString() : undefined,
		user_metadata: { name: opts.name ?? 'Conta', phone: opts.phone ?? '' },
		app_metadata: {},
		aud: 'authenticated',
		created_at: new Date().toISOString()
	} as User;
}

/** A guest who ordered on the site before having an account. */
async function guestWithOrder(email: string | null, phone: string) {
	const [c] = await db()<{ id: string }[]>`
		insert into customers (name, phone_e164, email) values ('Convidado', ${phone}, ${email})
		returning id`;
	await db()`
		insert into orders (channel, source_mode, customer_id, status, payment_status, fulfillment_type,
			subtotal_cents, total_cents, catalog_version, idempotency_key, payment_plan)
		values ('web', 'web', ${c.id}, 'completed', 'paid', 'pickup', 1000, 1000, 1, ${randomUUID()}, 'pix_key')`;
	return c.id;
}

const phone = () => `+55119${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;

describe('linking guest orders to an account', () => {
	it('links a guest record by verified e-mail and audits it', async () => {
		const email = `ana-${randomUUID().slice(0, 6)}@exemplo.com`;
		const guestId = await guestWithOrder(email, phone());
		const user = await authUser(email.toUpperCase(), { verified: true });
		const session = await ensureCustomer(user);
		expect(session.id).toBe(guestId);
		expect(await customerOrders(session.id)).toHaveLength(1);
		const [a] = await db()<{ summary: { via: string } }[]>`
			select summary from audit_log where action = 'customer.linked' and object_id = ${guestId}`;
		expect(a.summary.via).toBe('email');
	});

	it('does not link an unverified e-mail', async () => {
		const email = `bia-${randomUUID().slice(0, 6)}@exemplo.com`;
		const guestId = await guestWithOrder(email, phone());
		const session = await ensureCustomer(await authUser(email, { verified: false }));
		expect(session.id).not.toBe(guestId);
		expect(await customerOrders(session.id)).toHaveLength(0);
	});

	it('never links by phone; the number is kept only as a contact', async () => {
		const number = phone();
		const guestId = await guestWithOrder(`outra-${randomUUID().slice(0, 6)}@exemplo.com`, number);
		const user = await authUser(`caio-${randomUUID().slice(0, 6)}@exemplo.com`, {
			verified: true,
			phone: number
		});
		const session = await ensureCustomer(user);
		expect(session.id).not.toBe(guestId);
		expect(session.phone).toBe(number);
		expect(await customerOrders(session.id)).toHaveLength(0);
		const [row] = await db()<{ phone_e164: string | null; contact_phone_e164: string | null }[]>`
			select phone_e164, contact_phone_e164 from customers where id = ${session.id}`;
		expect(row).toEqual({ phone_e164: null, contact_phone_e164: number });
	});

	it('brings guest orders over when the e-mail is verified after the account was made', async () => {
		const email = `dani-${randomUUID().slice(0, 6)}@exemplo.com`;
		const guestId = await guestWithOrder(email, phone());
		const user = await authUser(email, { verified: false });
		const first = await ensureCustomer(user);
		expect(await customerOrders(first.id)).toHaveLength(0);
		const again = await ensureCustomer({ ...user, email_confirmed_at: new Date().toISOString() });
		expect(again.id).toBe(first.id);
		expect(await customerOrders(again.id)).toHaveLength(1);
		const [g] = await db()<{ deleted_at: Date | null }[]>`
			select deleted_at from customers where id = ${guestId}`;
		expect(g.deleted_at).not.toBeNull();
	});

	it('lets only one account take a guest record', async () => {
		const email = `eva-${randomUUID().slice(0, 6)}@exemplo.com`;
		const guestId = await guestWithOrder(email, phone());
		const [a, b] = await Promise.all([
			ensureCustomer(await authUser(email, { verified: true })),
			ensureCustomer(await authUser(email, { verified: true }))
		]);
		expect([a.id, b.id].filter((id) => id === guestId)).toHaveLength(1);
		const owners = await db()`select auth_user_id from customers where id = ${guestId}`;
		expect(owners).toHaveLength(1);
	});
});
