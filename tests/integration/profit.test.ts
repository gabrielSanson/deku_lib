// S4.3: the worked example. A R$45,00 iFood order (shop delivers, paid in the app) keeps R$38,16
// before food cost; the same order on the site with Efí Pix keeps R$44,46, R$6,30 more.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { orderProfitDetail, profitReport } from '#lib/server/analytics/profit.ts';
import { salesByChannel, todayLocal } from '#lib/server/analytics/queries.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { setTenderFee } from '#lib/server/payments/fees.ts';
import { savePaymentSettings } from '#lib/server/payments/provider.ts';
import { classic, ensureCashOpen, makeStaff } from './helpers.ts';

let manager: Awaited<ReturnType<typeof makeStaff>>;

/** A R$45,00 order on a channel, shaped directly so the example's numbers hold exactly. */
async function order45(channel: 'ifood' | 'web') {
	const o = await createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [classic],
		fulfillmentType: 'counter',
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		actor: manager
	});
	await db()`update orders set channel = ${channel}, total_cents = 4500, subtotal_cents = 4500,
		discount_cents = 0, delivery_fee_cents = 0, fulfillment_type = 'delivery',
		fulfillment_provider = 'own_driver', payment_plan = ${channel === 'ifood' ? 'channel' : 'online'},
		payment_status = 'paid', campaign_id = null, coupon_id = null
		where id = ${o.id}`;
	if (channel === 'web') {
		const [t] = await db()<{ id: string }[]>`
			insert into tenders (order_id, method, provider, provider_reference, amount_cents, status,
				idempotency_key, confirmed_at)
			values (${o.id}, 'pix', 'efi', ${randomUUID()}, 4500, 'paid', ${randomUUID()}, now())
			returning id`;
		await setTenderFee(db(), t.id);
	}
	return o.id;
}

beforeAll(async () => {
	manager = await makeStaff('admin');
	await ensureCashOpen(manager);
	await savePaymentSettings(
		{
			provider: 'efi',
			methods: ['pix'],
			psp: {
				clientId: 'efi-client',
				clientSecret: 'efi-secret',
				pixKey: 'pix@loja.test',
				sandbox: true,
				certificate: Buffer.from('not a real cert').toString('base64')
			}
		},
		{ type: 'staff', id: manager.id }
	);
});

afterAll(async () => {
	await db()`delete from payment_settings where shop_id = current_shop_id()`;
	await stopBoss();
	await closeDb();
});

describe('profit', () => {
	it('reproduces the worked example', async () => {
		const ifood = await orderProfitDetail(await order45('ifood'));
		expect(ifood).toMatchObject({ commissionCents: 540, feesCents: 144, beforeFoodCents: 3816 });
		// No ficha técnica for the burger here: reported, never zero.
		expect(ifood?.foodCostCents).toBeNull();
		expect(ifood?.netCents).toBeNull();

		const site = await orderProfitDetail(await order45('web'));
		expect(site).toMatchObject({ commissionCents: 0, feesCents: 54, beforeFoodCents: 4446 });
		expect(site!.beforeFoodCents - ifood!.beforeFoodCents).toBe(630);
	});

	it('reconciles with the sales report and tells what iFood orders cost', async () => {
		const today = todayLocal();
		const range = { from: today, to: today };
		const [report, sales] = await Promise.all([profitReport(range), salesByChannel(range)]);
		const salesGross = sales.reduce((n, s) => n + s.grossCents, 0);
		expect(report.total.grossCents).toBe(salesGross);
		expect(report.total.orders).toBe(sales.reduce((n, s) => n + s.orders, 0));
		const ifood = report.channels.find((c) => c.channel === 'ifood')!;
		expect(ifood.orders).toBeGreaterThan(0);
		expect(report.total.withoutRecipe).toBeGreaterThan(0);
		// Per iFood order of R$45: 540 + 144 − 54 = 630.
		expect(report.ifood.extraCents).toBeGreaterThanOrEqual(630);
	});
});
