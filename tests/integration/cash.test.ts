import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	closeSession,
	getOpenSession,
	listMovements,
	openSession,
	recordDrawerMovement,
	sessionBalance
} from '#lib/server/cash/service.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { recordManualTender, refundTender } from '#lib/server/payments/tenders.ts';
import { classic, makeStaff } from './helpers.ts';

let cashier: Awaited<ReturnType<typeof makeStaff>>;
let kitchen: Awaited<ReturnType<typeof makeStaff>>;

beforeAll(async () => {
	cashier = await makeStaff('attendant');
	kitchen = await makeStaff('kitchen');
	// Start from a closed drawer whatever earlier files left open.
	await db()`update cash_sessions set status = 'closed', closed_at = now() where status = 'open'`;
});

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

function counterOrder() {
	return createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [classic],
		fulfillmentType: 'counter',
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		actor: cashier
	});
}

describe('cash drawer', () => {
	it('refuses a cash sale while the drawer is closed, but takes other methods', async () => {
		const o = await counterOrder();
		await expect(
			recordManualTender({
				orderId: o.id,
				method: 'cash',
				amountCents: o.totalCents,
				idempotencyKey: randomUUID(),
				actor: cashier
			})
		).rejects.toMatchObject({ code: 'cash_closed' });
		const [{ n }] = await db()<
			{ n: number }[]
		>`select count(*)::int as n from tenders where order_id = ${o.id}`;
		expect(n).toBe(0);
		await recordManualTender({
			orderId: o.id,
			method: 'terminal_card',
			amountCents: o.totalCents,
			providerReference: 'NSU1',
			idempotencyKey: randomUUID(),
			actor: cashier
		});
	});

	it('opens once, records sales, sangria, suprimento and refunds, and closes blind', async () => {
		await expect(openSession({ floatCents: 10000, actor: kitchen })).rejects.toMatchObject({
			code: 'forbidden'
		});
		await openSession({ floatCents: 10000, actor: cashier });
		await expect(openSession({ floatCents: 0, actor: cashier })).rejects.toMatchObject({
			code: 'already_open'
		});

		const o = await counterOrder();
		await recordManualTender({
			orderId: o.id,
			method: 'cash',
			amountCents: o.totalCents,
			cashReceivedCents: o.totalCents + 1000,
			idempotencyKey: randomUUID(),
			actor: cashier
		});
		const session = (await getOpenSession())!;
		let balance = await sessionBalance(session);
		// Only the amount kept counts: the change went back to the customer.
		expect(balance.salesCents).toBe(o.totalCents);

		await expect(
			recordDrawerMovement({ kind: 'sangria', amountCents: 500, reason: '', actor: cashier })
		).rejects.toMatchObject({ code: 'reason_required' });
		await expect(
			recordDrawerMovement({
				kind: 'sangria',
				amountCents: 999999,
				reason: 'cofre',
				actor: cashier
			})
		).rejects.toThrow();
		await recordDrawerMovement({
			kind: 'sangria',
			amountCents: 5000,
			reason: 'cofre',
			actor: cashier
		});
		await recordDrawerMovement({
			kind: 'suprimento',
			amountCents: 2000,
			reason: '',
			actor: cashier
		});

		const manager = await makeStaff('admin');
		const [tender] = await db()<{ id: string }[]>`select id from tenders where order_id = ${o.id}`;
		await refundTender(tender.id, 'cliente desistiu', manager);

		balance = await sessionBalance(session);
		expect(balance).toMatchObject({
			openingFloatCents: 10000,
			salesCents: o.totalCents,
			refundsCents: -o.totalCents,
			sangriaCents: -5000,
			suprimentoCents: 2000,
			expectedCents: 7000
		});
		const movements = await listMovements(session.id);
		expect(movements.map((m) => m.kind).sort()).toEqual([
			'refund',
			'sale',
			'sangria',
			'suprimento'
		]);
		expect(movements.find((m) => m.kind === 'sale')?.orderNumber).toBe(o.orderNumber);

		const closed = await closeSession({ countedCents: 6900, note: 'faltou moeda', actor: cashier });
		expect(closed).toMatchObject({
			expectedCents: 7000,
			countedCents: 6900,
			differenceCents: -100
		});
		expect(await getOpenSession()).toBeNull();
		await expect(closeSession({ countedCents: 0, actor: cashier })).rejects.toMatchObject({
			code: 'cash_closed'
		});
	});
});
