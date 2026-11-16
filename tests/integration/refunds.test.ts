// S5.6: "Cancelar e devolver". Online payments are refunded at the provider (each marked as it
// succeeds), cash leaves the open drawer, an open order is cancelled (stock goes back), a
// delivered one stays completed (sales reports keep it), and an NFC-e problem never blocks it.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder, transitionOrder } from '#lib/server/orders/service.ts';
import { cancelAndRefund } from '#lib/server/payments/refunds.ts';
import { recordManualTender } from '#lib/server/payments/tenders.ts';
import { classic, ensureCashOpen, makeStaff } from './helpers.ts';

let admin: Awaited<ReturnType<typeof makeStaff>>;
let attendant: Awaited<ReturnType<typeof makeStaff>>;
const REASON = 'Cliente desistiu do pedido';

async function order() {
	return createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [classic],
		fulfillmentType: 'counter',
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		actor: admin
	});
}

async function cashPaid() {
	const o = await order();
	await recordManualTender({
		orderId: o.id,
		method: 'cash',
		amountCents: o.totalCents,
		idempotencyKey: randomUUID(),
		actor: admin
	});
	return o;
}

const noFiscal = async () => {};

beforeAll(async () => {
	admin = await makeStaff('admin');
	attendant = await makeStaff('attendant');
	await ensureCashOpen(admin);
});

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

describe('cancel and refund', () => {
	it('is for admins, with a real reason', async () => {
		const o = await cashPaid();
		await expect(cancelAndRefund(o.id, REASON, attendant)).rejects.toThrow();
		await expect(cancelAndRefund(o.id, 'curto', admin)).rejects.toThrow();
	});

	it('gives cash back from the drawer and cancels the order', async () => {
		const o = await cashPaid();
		const r = await cancelAndRefund(o.id, REASON, admin, undefined, noFiscal);
		expect(r).toEqual({ refundedCents: o.totalCents, cancelled: true, fiscalProblem: null });
		const [row] = await db()<{ status: string; payment_status: string }[]>`
			select status, payment_status from orders where id = ${o.id}`;
		expect(row).toEqual({ status: 'cancelled', payment_status: 'refunded' });
		const [m] = await db()<{ amount: number }[]>`
			select m.amount_cents as amount from cash_movements m join tenders t on t.id = m.tender_id
			where t.order_id = ${o.id} and m.kind = 'refund'`;
		expect(m.amount).toBe(-o.totalCents);
		const [{ n }] = await db()<{ n: number }[]>`
			select count(*)::int as n from pgboss.job where name = 'stock-reverse' and data->>'orderId' = ${o.id}`;
		expect(n).toBe(1);
	});

	it('refunds online payments at the provider, and retries only what is owed', async () => {
		const o = await order();
		const half = Math.floor(o.totalCents / 2);
		await db()`insert into tenders (order_id, method, provider, provider_reference, amount_cents, status, idempotency_key, confirmed_at)
			values (${o.id}, 'pix', 'mercadopago', ${`ref-${o.id}`}, ${half}, 'paid', ${randomUUID()}, now()),
				(${o.id}, 'online_card', 'mercadopago', ${`ref2-${o.id}`}, ${o.totalCents - half}, 'paid', ${randomUUID()}, now())`;
		const calls: string[] = [];
		let fail = true;
		const refunder = async (_p: string, ref: string, _c: number, key: string) => {
			if (ref.startsWith('ref2') && fail) throw new Error('provider down');
			calls.push(key);
		};
		await expect(cancelAndRefund(o.id, REASON, admin, refunder, noFiscal)).rejects.toThrow(
			'provider down'
		);
		const [still] = await db()<{ status: string }[]>`select status from orders where id = ${o.id}`;
		expect(still.status).toBe('confirmed');
		fail = false;
		const r = await cancelAndRefund(o.id, REASON, admin, refunder, noFiscal);
		expect(r.refundedCents).toBe(o.totalCents - half);
		expect(calls).toHaveLength(2);
		expect(new Set(calls).size).toBe(2);
		const [row] = await db()<{ status: string; payment_status: string }[]>`
			select status, payment_status from orders where id = ${o.id}`;
		expect(row).toEqual({ status: 'cancelled', payment_status: 'refunded' });
	});

	it('keeps a delivered order completed, and an NFC-e problem does not block the refund', async () => {
		const o = await cashPaid();
		await transitionOrder({ orderId: o.id, to: 'preparing', actor: admin });
		await transitionOrder({ orderId: o.id, to: 'ready', actor: admin });
		await transitionOrder({ orderId: o.id, to: 'completed', actor: admin });
		await db()`insert into fiscal_documents (order_id, ref, environment, status)
			values (${o.id}, ${`ref-${o.id}`}, 'homologacao', 'authorized')`;
		const r = await cancelAndRefund(o.id, REASON, admin, undefined, async () => {
			throw new Error('Prazo de cancelamento encerrado');
		});
		expect(r.cancelled).toBe(false);
		expect(r.fiscalProblem).toBe('Prazo de cancelamento encerrado');
		const [row] = await db()<{ status: string; payment_status: string }[]>`
			select status, payment_status from orders where id = ${o.id}`;
		expect(row).toEqual({ status: 'completed', payment_status: 'refunded' });
		await db()`delete from fiscal_documents where order_id = ${o.id}`;
	});
});
