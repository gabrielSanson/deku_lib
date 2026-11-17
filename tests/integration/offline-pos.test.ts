// S5.10: sales queued offline are created once, keep the price charged at the counter, record their
// tender, and report a closed drawer or a sold-out item as a conflict instead of failing the batch.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { closeDb, db } from '#lib/server/db.ts';
import { loadStaff, staffActor, type StaffSession } from '#lib/server/auth/staff.ts';
import { getCatalogForPricing } from '#lib/server/catalog/service.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { syncOfflineOrders, type OfflineOrder } from '#lib/server/pos/offline-sync.ts';
import { makeStaff } from './helpers.ts';

let clerk: StaffSession;
let sku: string;
let price: number;

const sale = (over: Partial<OfflineOrder> = {}): OfflineOrder => ({
	key: randomUUID(),
	number: 'OFF-1',
	createdAt: new Date().toISOString(),
	catalogVersion: null,
	lines: [{ sku, quantity: 1, options: [] }],
	fulfillmentType: 'pickup',
	discountCents: 0,
	totalCents: price,
	tender: { method: 'terminal_card' },
	...over
});

beforeAll(async () => {
	clerk = (await loadStaff((await makeStaff('attendant')).id!, null))!;
	const catalog = await getCatalogForPricing();
	const p = catalog.products.find(
		(x) => x.channels.includes('counter') && x.modifierGroups.every((g) => g.minSelections === 0)
	)!;
	sku = p.sku;
	price = p.priceCents;
});

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

describe('offline POS sync', () => {
	it('creates each queued sale once, paid by the card machine', async () => {
		const s = sale({ number: 'OFF-7' });
		const [r1] = await syncOfflineOrders([s], staffActor(clerk));
		expect(r1.status).toBe('synced');
		const [again] = await syncOfflineOrders([s], staffActor(clerk));
		expect(again).toEqual(r1);
		const id = r1.status === 'synced' ? r1.orderId : '';
		const [o] = await db()<{ status: string; payment_status: string; customer_label: string }[]>`
			select status, payment_status, customer_label from orders where id = ${id}`;
		expect(o).toEqual({ status: 'confirmed', payment_status: 'paid', customer_label: 'OFF-7' });
		const tenders = await db()<{ provider_reference: string }[]>`
			select provider_reference from tenders where order_id = ${id}`;
		expect(tenders.map((t) => t.provider_reference)).toEqual(['OFF-7']);
	});

	it('keeps the offline price when the menu got dearer', async () => {
		const [r] = await syncOfflineOrders([sale({ totalCents: price - 100 })], staffActor(clerk));
		expect(r.status).toBe('synced');
		const [o] = await db()<{ total_cents: number; discount_cents: number }[]>`
			select total_cents, discount_cents from orders where id = ${r.status === 'synced' ? r.orderId : ''}`;
		expect(o).toEqual({ total_cents: price - 100, discount_cents: 100 });
	});

	it('books cash into the open drawer, or reports a conflict with its order when none is open', async () => {
		const [open] = await db()`select 1 from cash_sessions where status = 'open'`;
		const [r] = await syncOfflineOrders(
			[sale({ tender: { method: 'cash', receivedCents: price + 500 } })],
			staffActor(clerk)
		);
		if (open) {
			expect(r.status).toBe('synced');
		} else {
			expect(r.status).toBe('conflict');
			expect(r.status === 'conflict' && r.orderId && r.error.length > 0).toBeTruthy();
		}
	});

	it('sends in the order sold and reports an unknown item', async () => {
		const later = sale({ createdAt: new Date(Date.now() + 1000).toISOString() });
		const bad = sale({ lines: [{ sku: 'NOPE-404', quantity: 1, options: [] }] });
		const results = await syncOfflineOrders([later, bad], staffActor(clerk));
		expect(results.map((r) => r.key)).toEqual([bad.key, later.key]);
		expect(results[0].status).toBe('conflict');
		expect(results[1].status).toBe('synced');
	});
});
