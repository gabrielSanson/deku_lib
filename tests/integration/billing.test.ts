// S1.5: the platform's monthly fee, late warnings, suspension and reactivation.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, platformDb } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import {
	applyLateStatuses,
	createMonthlyInvoices,
	invoicesOfShop,
	markInvoicePaid
} from '#lib/server/platform/billing.ts';

import { OTHER_SHOP_ID } from './setup';

const shopId = randomUUID();
const mailed: string[] = [];
const mail = async (_shop: string, invoice: string) => {
	mailed.push(invoice);
};
const at = (d: string) => new Date(`${d}T12:00:00-03:00`);

beforeAll(async () => {
	await platformDb()`update platform_settings set pix_key = 'financeiro@plataforma.test',
		pix_merchant_name = 'Plataforma', pix_merchant_city = 'Sao Paulo', grace_days = 7 where id = 1`;
	await platformDb()`insert into shops (id, slug, name, status, trial_ends_at)
		values (${shopId}, ${`cobra-${shopId.slice(0, 6)}`}, 'Loja que paga', 'trial', '2026-12-20T00:00:00Z')`;
	await platformDb()`select init_shop_rows(${shopId})`;
});

afterAll(async () => {
	await platformDb()`update shops set status = 'closed' where id = ${shopId}`;
	// Other test shops were billed too; leave them as the other tests expect.
	await platformDb()`update invoices set status = 'void' where shop_id <> ${shopId} and status = 'open'`;
	await platformDb()`update shops set status = 'active' where id = ${OTHER_SHOP_ID}`;
	await stopBoss();
	await closeDb();
});

describe('monthly fee', () => {
	it('waits for the trial to end, then invoices once a month with a Pix code', async () => {
		const before = await createMonthlyInvoices(at('2026-12-01'), mail);
		expect((await invoicesOfShop(shopId)).length).toBe(0);
		expect(before.period.start).toBe('2026-12-01');

		await createMonthlyInvoices(at('2027-01-01'), mail);
		await createMonthlyInvoices(at('2027-01-01'), mail);
		const [inv, ...rest] = await invoicesOfShop(shopId);
		expect(rest).toEqual([]);
		expect(inv).toMatchObject({ periodStart: '2027-01-01', amountCents: 9990, status: 'open' });
		expect(inv.pixPayload).toMatch(/^000201.*br\.gov\.bcb\.pix.*6304[0-9A-F]{4}$/);
		expect(mailed).toContain(inv.id);
		const [shop] = await platformDb()`select status from shops where id = ${shopId}`;
		expect(shop.status).toBe('active');
	});

	it('warns after the grace days, suspends two weeks later and reactivates when paid', async () => {
		const status = async () =>
			(await platformDb()`select status from shops where id = ${shopId}`)[0].status;
		await applyLateStatuses(at('2027-01-15'));
		expect(await status()).toBe('active');
		await applyLateStatuses(at('2027-01-19'));
		expect(await status()).toBe('past_due');
		await applyLateStatuses(at('2027-02-02'));
		expect(await status()).toBe('suspended');

		const [inv] = await invoicesOfShop(shopId);
		expect(await markInvoicePaid(inv.id, { type: 'platform', id: null }, at('2027-02-03'))).toBe(
			true
		);
		expect(await status()).toBe('active');
		expect(await markInvoicePaid(inv.id, { type: 'platform', id: null })).toBe(false);
	});

	it('never invoices the install’s own shop', async () => {
		const own =
			await platformDb()`select 1 from invoices where shop_id = '00000000-0000-4000-8000-000000000001'`;
		expect(own.length).toBe(0);
	});
});
