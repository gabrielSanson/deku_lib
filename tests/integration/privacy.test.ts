// S3.6: a customer can ask for a copy of their data or to be deleted. Deletion anonymises the
// customer and keeps the orders (and their totals) under "Cliente removido".
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	answerRequest,
	confirmByEmail,
	exportCustomerData,
	listPrivacyRequests,
	requestAsCustomer,
	requestByEmail,
	REMOVED_LABEL
} from '#lib/server/customers/privacy.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { classic, ensureCashOpen, makeStaff } from './helpers.ts';

let manager: Awaited<ReturnType<typeof makeStaff>>;
const tag = randomUUID().slice(0, 6);

async function customerWithOrder(name: string, email: string) {
	const o = await createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [classic],
		fulfillmentType: 'counter',
		customer: { name, email, marketingConsent: true },
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		actor: manager
	});
	const [c] = await db()<{ id: string }[]>`
		select customer_id as id from orders where id = ${o.id}`;
	return { customerId: c.id, orderId: o.id };
}

beforeAll(async () => {
	manager = await makeStaff('admin');
	await ensureCashOpen(manager);
});

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

describe('privacy requests', () => {
	it('exports what the shop keeps about the customer', async () => {
		const { customerId } = await customerWithOrder(`Ana ${tag}`, `ana-${tag}@x.test`);
		const data = await exportCustomerData(customerId);
		expect(data.customer.email).toBe(`ana-${tag}@x.test`);
		expect(data.orders).toHaveLength(1);
		expect((data.orders[0].items as unknown[]).length).toBeGreaterThan(0);
	});

	it('deletion anonymises the customer and keeps the order totals', async () => {
		const { customerId, orderId } = await customerWithOrder(`Bia ${tag}`, `bia-${tag}@x.test`);
		const [before] = await db()<{ total_cents: number }[]>`
			select total_cents from orders where id = ${orderId}`;
		const id = await requestAsCustomer(customerId, 'delete');
		// Asking again reuses the open request.
		expect(await requestAsCustomer(customerId, 'delete')).toBe(id);
		expect((await listPrivacyRequests()).some((r) => r.id === id)).toBe(true);

		await answerRequest(id, 'done', { type: 'staff', id: manager.id });
		const [c] = await db()<
			{ name: string | null; email: string | null; deleted_at: Date | null }[]
		>`select name, email, deleted_at from customers where id = ${customerId}`;
		expect(c.name).toBeNull();
		expect(c.email).toBeNull();
		expect(c.deleted_at).not.toBeNull();
		const [o] = await db()<{ total_cents: number; customer_label: string }[]>`
			select total_cents, customer_label from orders where id = ${orderId}`;
		expect(o.total_cents).toBe(before.total_cents);
		expect(o.customer_label).toBe(REMOVED_LABEL);
		await expect(answerRequest(id, 'done', { type: 'staff', id: manager.id })).rejects.toThrow();
	});

	it('the public form needs the e-mailed code and stops after five wrong tries', async () => {
		const email = `caio-${tag}@x.test`;
		const { customerId } = await customerWithOrder(`Caio ${tag}`, email);
		const { id, code } = await requestByEmail(email.toUpperCase(), 'access');
		expect(code).toMatch(/^\d{6}$/);
		const [mail] = await db()<{ to_address: string }[]>`
			select to_address from message_outbox where to_address = ${email}`;
		expect(mail).toBeTruthy();

		await confirmByEmail(id, code);
		const [r] = await db()<{ status: string; customer_id: string }[]>`
			select status, customer_id from privacy_requests where id = ${id}`;
		expect(r).toMatchObject({ status: 'pending', customer_id: customerId });

		const other = await requestByEmail(email, 'delete');
		const wrong = other.code === '000000' ? '111111' : '000000';
		for (let i = 0; i < 5; i++) await expect(confirmByEmail(other.id, wrong)).rejects.toThrow();
		await expect(confirmByEmail(other.id, other.code)).rejects.toThrow();
		await db()`delete from privacy_requests where id = ${other.id}`;
	});

	it('refuses a malformed e-mail', async () => {
		await expect(requestByEmail('not-an-email', 'access')).rejects.toThrow();
	});
});
