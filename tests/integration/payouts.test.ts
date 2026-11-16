// S2.4: iFood statement upload matched to our iFood orders.
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { mapIfoodOrder, type IfoodOrder } from '#lib/server/integrations/ifood/mapping.ts';
import { importIfoodPayouts, payoutReport } from '#lib/server/integrations/ifood/payouts.ts';
import { createOrder } from '#lib/server/orders/service.ts';

const fixture = JSON.parse(
	readFileSync('tests/fixtures/ifood/order-delivery.json', 'utf8')
) as IfoodOrder;
const actor = { type: 'system' as const, id: null };

async function ifoodOrder(displayId: string) {
	const id = randomUUID();
	const m = mapIfoodOrder({ ...fixture, id, displayId, isTest: false }, () => null);
	const o = await createOrder({
		channel: 'ifood',
		sourceMode: 'ifood_api',
		lines: [],
		externalPricing: {
			cart: m.cart,
			deliveryFeeCents: m.deliveryFeeCents,
			discountCents: m.discountCents
		},
		fulfillmentType: m.fulfillmentType,
		fulfillmentProvider: m.fulfillmentProvider,
		idempotencyKey: `ifood:${id}`,
		channelOrderId: id,
		channelDisplayId: displayId,
		paymentPlan: 'channel',
		paymentStatus: 'paid',
		actor
	});
	await db()`update orders set status = 'completed', created_at = '2026-11-03T15:00:00-03:00' where id = ${o.id}`;
	return { id, orderId: o.id, total: o.totalCents };
}

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

describe('iFood payout check', () => {
	it('matches every statement line to its order and lists what does not add up', async () => {
		const a = await ifoodOrder('P001');
		const b = await ifoodOrder('P002');
		const left = await ifoodOrder('P003');
		const csv =
			'Data do pedido;ID do pedido;Valor bruto;Comissão;Taxa de pagamento;Valor líquido\n' +
			`03/11/2026;${a.id};${(a.total / 100).toFixed(2).replace('.', ',')};-10,00;-2,00;${((a.total - 1200) / 100).toFixed(2).replace('.', ',')}\n` +
			`03/11/2026;P002;${(b.total / 100).toFixed(2).replace('.', ',')};-10,00;-2,00;${((b.total - 1200) / 100).toFixed(2).replace('.', ',')}\n` +
			'03/11/2026;NAO-EXISTE;20,00;-2,00;0;18,00\n';
		const r = await importIfoodPayouts(csv, 'extrato.csv', actor);
		expect(r).toMatchObject({ rows: 3, matched: 2 });
		const report = (await payoutReport(r.uploadId))!;
		expect(report.matched.map((l) => l.order_id).sort()).toEqual([a.orderId, b.orderId].sort());
		expect(report.unknown.map((l) => l.channel_order_ref)).toEqual(['NAO-EXISTE']);
		expect(report.missing.map((o) => o.id)).toContain(left.orderId);
		expect(report.totals.commissionCents).toBe(2200);
		expect(report.totals.expectedCents).toBe(a.total + b.total);
	});

	it('refuses a file without the order and amount columns', async () => {
		await expect(importIfoodPayouts('x;y\n1;2\n', null, actor)).rejects.toThrow();
	});
});
