// S4.2: each paid tender gets its fee from the shop's terms (defaults until edited); old tenders
// are filled in by the backfill job.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_TERMS } from '#lib/domain/payment-fees.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { backfillTenderFees, paymentTerms, savePaymentTerms } from '#lib/server/payments/fees.ts';
import { recordManualTender } from '#lib/server/payments/tenders.ts';
import { classic, ensureCashOpen, makeStaff } from './helpers.ts';

let manager: Awaited<ReturnType<typeof makeStaff>>;

async function paidByCard() {
	const o = await createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [classic],
		fulfillmentType: 'counter',
		idempotencyKey: randomUUID(),
		paymentPlan: 'counter',
		actor: manager
	});
	await recordManualTender({
		orderId: o.id,
		method: 'terminal_card',
		amountCents: o.totalCents,
		providerReference: 'NSU1',
		idempotencyKey: randomUUID(),
		actor: manager
	});
	const [t] = await db()<
		{ id: string; fee_cents: number; amount_cents: number; fee_source: string }[]
	>`
		select id, fee_cents, amount_cents, fee_source from tenders where order_id = ${o.id}`;
	return t;
}

beforeAll(async () => {
	manager = await makeStaff('admin');
	await ensureCashOpen(manager);
});

afterAll(async () => {
	await db()`delete from payment_method_terms`;
	await stopBoss();
	await closeDb();
});

describe('payment fees', () => {
	it('stores the default card fee on a paid tender', async () => {
		const t = await paidByCard();
		expect(t.fee_source).toBe('terms');
		expect(t.fee_cents).toBe(Math.round((t.amount_cents * 300) / 10_000));
	});

	it('uses the terms the owner saved, and refuses nonsense', async () => {
		const terms = (await paymentTerms()).map((x) =>
			x.method === 'terminal_card' ? { ...x, feeBps: 150, feeFixedCents: 10 } : x
		);
		await savePaymentTerms(terms, manager);
		const t = await paidByCard();
		expect(t.fee_cents).toBe(Math.round((t.amount_cents * 150) / 10_000) + 10);
		await expect(
			savePaymentTerms([{ ...DEFAULT_TERMS[0], feeBps: 9000 }], manager)
		).rejects.toThrow();
	});

	it('backfills tenders paid before fees were recorded', async () => {
		const t = await paidByCard();
		await db()`update tenders set fee_cents = 0, fee_source = null where id = ${t.id}`;
		expect(await backfillTenderFees()).toBeGreaterThan(0);
		const [after] = await db()<
			{ fee_cents: number }[]
		>`select fee_cents from tenders where id = ${t.id}`;
		expect(after.fee_cents).toBe(t.fee_cents);
	});
});
