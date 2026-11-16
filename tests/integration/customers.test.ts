// S3.3: the customer list keeps order totals, records where each contact came from, and never
// offers a delivery-app contact for marketing.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { customersCsv, listCustomers } from '#lib/server/customers/list.ts';
import { createOrder, transitionOrder } from '#lib/server/orders/service.ts';
import { getStoreSettings, updateStoreSettings } from '#lib/server/settings/service.ts';
import { classic, ensureCashOpen, makeStaff } from './helpers.ts';

let manager: Awaited<ReturnType<typeof makeStaff>>;
const phone = () => `+55119${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;

function order(
	channel: 'counter' | 'web' | 'ifood',
	customer: { name: string; phoneE164?: string; marketingConsent?: boolean }
) {
	return createOrder({
		channel,
		sourceMode: channel === 'ifood' ? 'ifood_api' : channel === 'web' ? 'web' : 'staff_pos',
		channelOrderId: channel === 'ifood' ? randomUUID() : undefined,
		lines: [classic],
		fulfillmentType: 'counter',
		customer,
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		paymentPlan: channel === 'ifood' ? 'channel' : undefined,
		actor: manager
	});
}

async function customerOf(orderId: string) {
	const [c] = await db()<
		{
			id: string;
			source: string;
			orders_count: number;
			total_spent_cents: string;
			marketing_consent_at: Date | null;
		}[]
	>`select c.id, c.source, c.orders_count, c.total_spent_cents, c.marketing_consent_at
		from customers c join orders o on o.customer_id = c.id where o.id = ${orderId}`;
	return c;
}

beforeAll(async () => {
	manager = await makeStaff('admin');
	await ensureCashOpen(manager);
	const s = await getStoreSettings();
	await updateStoreSettings(
		{ acceptingOrders: true, webOrderingEnabled: true, pickupEnabled: true },
		manager,
		s.version
	);
});

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

describe('customer list', () => {
	it('keeps orders count and total, and takes a cancelled order back out', async () => {
		const p = phone();
		const a = await order('web', { name: 'Bia Lima', phoneE164: p, marketingConsent: true });
		const b = await order('web', { name: 'Bia Lima', phoneE164: p });
		let c = await customerOf(a.id);
		expect(c).toMatchObject({ source: 'own', orders_count: 2 });
		expect(Number(c.total_spent_cents)).toBe(a.totalCents + b.totalCents);
		await transitionOrder({ orderId: b.id, to: 'cancelled', actor: manager, reason: 'Teste' });
		c = await customerOf(a.id);
		expect(c.orders_count).toBe(1);
		expect(Number(c.total_spent_cents)).toBe(a.totalCents);
	});

	it('records a delivery-app contact without consent, and never lists it for marketing', async () => {
		const p = phone();
		const o = await order('ifood', { name: 'Caio iFood', phoneE164: p, marketingConsent: true });
		const c = await customerOf(o.id);
		expect(c).toMatchObject({ source: 'ifood', marketing_consent_at: null });
		await db()`update customers set marketing_consent_at = now() where id = ${c.id}`;
		const marketable = await listCustomers({ marketable: true, q: 'Caio iFood' });
		expect(marketable).toHaveLength(0);
		const all = await listCustomers({ q: 'Caio iFood' });
		expect(all[0]).toMatchObject({ source: 'ifood', mayMarket: false });
		const csv = await customersCsv('marketing');
		expect(csv).not.toContain('Caio iFood');
	});

	it('becomes the shop contact once the person orders on the site', async () => {
		const p = phone();
		await order('ifood', { name: 'Duda', phoneE164: p });
		const o = await order('web', { name: 'Duda', phoneE164: p, marketingConsent: true });
		const c = await customerOf(o.id);
		expect(c.source).toBe('own');
		expect((await listCustomers({ marketable: true, q: p.slice(-8) })).map((r) => r.id)).toEqual([
			c.id
		]);
	});

	it('exports everyone without phone numbers for delivery use', async () => {
		const p = phone();
		await order('web', { name: 'Eva Export', phoneE164: p });
		const csv = await customersCsv('delivery', { q: 'Eva Export' });
		expect(csv.split('\r\n')[0]).toBe('﻿nome;pedidos;total_gasto;ultimo_pedido;origem');
		expect(csv).toContain('Eva Export');
		expect(csv).not.toContain(p);
		expect(await customersCsv('marketing', { q: 'Eva Export' })).not.toContain('Eva Export');
	});

	it('filters frequent, new and inactive customers', async () => {
		const p = phone();
		const o = await order('counter', { name: 'Fabi Freq', phoneE164: p });
		const c = await customerOf(o.id);
		expect(c.source).toBe('pos');
		expect((await listCustomers({ filter: 'new', q: 'Fabi Freq' })).length).toBe(1);
		await db()`update customers set orders_count = 7, last_order_at = now() - interval '40 days'
			where id = ${c.id}`;
		expect((await listCustomers({ filter: 'frequent', q: 'Fabi Freq' })).length).toBe(1);
		expect((await listCustomers({ filter: 'inactive', q: 'Fabi Freq' })).length).toBe(1);
	});
});
