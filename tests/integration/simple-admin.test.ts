// The cookie preset: its sample menu loads with its pictures, and the simple staff
// area takes cash without a drawer.
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { getCatalog } from '#lib/server/catalog/service.ts';
import { importCatalog } from '#lib/server/catalog/editor.ts';
import { cookieCatalog } from '#lib/server/catalog/cookies.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { recordManualTender } from '#lib/server/payments/tenders.ts';
import { adminMode } from '#lib/server/presets/index.ts';
import { SYSTEM } from '#lib/server/audit.ts';
import { classic, makeStaff } from './helpers.ts';

let cashier: Awaited<ReturnType<typeof makeStaff>>;
const before = { preset: process.env.SHOP_PRESET, mode: process.env.ADMIN_MODE };

beforeAll(async () => {
	cashier = await makeStaff('attendant');
	await db()`update cash_sessions set status = 'closed', closed_at = now() where status = 'open'`;
});

afterEach(() => {
	process.env.SHOP_PRESET = before.preset;
	process.env.ADMIN_MODE = before.mode;
	if (before.preset === undefined) delete process.env.SHOP_PRESET;
	if (before.mode === undefined) delete process.env.ADMIN_MODE;
});

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

describe('cookie preset', () => {
	it('is simple unless ADMIN_MODE says otherwise', () => {
		process.env.SHOP_PRESET = 'cookie';
		delete process.env.ADMIN_MODE;
		expect(adminMode()).toBe('simple');
		process.env.ADMIN_MODE = 'full';
		expect(adminMode()).toBe('full');
		process.env.SHOP_PRESET = 'deku';
		delete process.env.ADMIN_MODE;
		expect(adminMode()).toBe('full');
	});

	it('loads the cookie menu with its pictures and keeps a photo the owner uploaded', async () => {
		const actor = SYSTEM;
		await importCatalog(cookieCatalog, actor);
		const photo = `${'a'.repeat(32)}.webp`;
		await db()`update menu_products set image_path = ${photo} where sku = 'COOKIE-TRAD'`;
		await importCatalog(cookieCatalog, actor);
		const catalog = await getCatalog({ fresh: true });
		const bySku = new Map(catalog.products.map((p) => [p.sku, p]));
		expect(bySku.get('COOKIE-TRAD')?.imageUrl).toBe(`/media/menu/${photo}`);
		expect(bySku.get('COOKIE-RV')?.imageUrl).toBe('/presets/cookie/products/red-velvet.svg');
		const box = bySku.get('CAIXA-6')!;
		expect(box.modifierGroups[0].minSelections).toBe(6);
		expect(box.modifierGroups[0].options[0].imageUrl).toMatch(/^\/presets\/cookie\/products\//);
	});

	it('takes cash without an open drawer in the simple staff area', async () => {
		process.env.ADMIN_MODE = 'simple';
		const o = await createOrder({
			channel: 'counter',
			sourceMode: 'staff_pos',
			lines: [classic],
			fulfillmentType: 'counter',
			idempotencyKey: randomUUID(),
			initialStatus: 'confirmed',
			actor: cashier
		});
		await recordManualTender({
			orderId: o.id,
			method: 'cash',
			amountCents: o.totalCents,
			idempotencyKey: randomUUID(),
			actor: cashier
		});
		const [t] = await db()<
			{ status: string }[]
		>`select status from tenders where order_id = ${o.id}`;
		expect(t.status).toBe('paid');
	});
});
