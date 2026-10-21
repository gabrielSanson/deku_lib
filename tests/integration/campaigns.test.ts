import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { CampaignInput } from '#lib/server/campaigns/service.ts';
import { campaignResults, saveCampaign } from '#lib/server/campaigns/service.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder, transitionOrder } from '#lib/server/orders/service.ts';
import { classic, makeStaff } from './helpers.ts';

let admin: Awaited<ReturnType<typeof makeStaff>>;

beforeAll(async () => {
	admin = await makeStaff('admin');
});

// Automatic campaigns apply to every order: never let one leak into another test or file.
afterEach(async () => {
	await db()`update campaigns set status = 'ended'`;
});

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

const code = () => `T${randomUUID().slice(0, 8).toUpperCase()}`;

function campaign(over: Partial<CampaignInput>) {
	return saveCampaign(
		{
			name: 'Teste',
			templateKey: 'code_discount',
			params: { benefit: { type: 'percent', percent: 10 } },
			activate: true,
			...over
		},
		admin
	);
}

function order(
	opts: {
		couponCode?: string;
		phone?: string;
		lines?: object[];
		discountCents?: number;
	} = {}
) {
	return createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: (opts.lines ?? [classic, { sku: 'ACP-FRITAS', quantity: 1 }]) as never,
		fulfillmentType: 'counter',
		customer: opts.phone ? { name: 'Ana', phoneE164: opts.phone } : undefined,
		couponCode: opts.couponCode,
		discountCents: opts.discountCents,
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		actor: admin
	});
}

async function saved(orderId: string) {
	const [o] = await db()<
		{
			discount_cents: number;
			total_cents: number;
			subtotal_cents: number;
			campaign_id: string | null;
			coupon_id: string | null;
		}[]
	>`select discount_cents, total_cents, subtotal_cents, campaign_id, coupon_id from orders where id = ${orderId}`;
	const items = await db()<
		{ product_sku: string; line_total_cents: number; discount_cents: number }[]
	>`
		select product_sku, line_total_cents, discount_cents from order_items where order_id = ${orderId} order by position`;
	return { ...o, items };
}

describe('coupons at order creation', () => {
	it('applies a typed code and records which campaign and coupon paid for it', async () => {
		const c = code();
		const id = await campaign({ code: c.toLowerCase() });
		const o = await order({ couponCode: ` ${c.toLowerCase()} ` });
		const s = await saved(o.id);
		expect(s.subtotal_cents).toBe(2890 + 1490);
		expect(s.discount_cents).toBe(438);
		expect(s.total_cents).toBe(2890 + 1490 - 438);
		expect(s.campaign_id).toBe(id);
		expect(s.coupon_id).not.toBeNull();
	});

	it('refuses an unknown or paused code instead of charging full price silently', async () => {
		await expect(order({ couponCode: 'NAOEXISTE' })).rejects.toThrow(/não encontrado/);
		const c = code();
		const id = await campaign({ code: c });
		await db()`update campaigns set status = 'paused' where id = ${id}`;
		await expect(order({ couponCode: c })).rejects.toThrow(/não está valendo/);
	});

	it('gives the free item on its own line, at menu price, with the same amount discounted', async () => {
		await campaign({
			templateKey: 'buy_x_get_y',
			autoApply: true,
			params: {
				trigger: { kind: 'quantity', scope: { type: 'categories', ids: ['burgers'] }, quantity: 2 },
				reward: { scope: { type: 'products', ids: ['ACP-FRITAS'] }, quantity: 1 }
			}
		});
		const o = await order({
			lines: [
				{ ...classic, quantity: 2 },
				{ sku: 'ACP-FRITAS', quantity: 1 }
			]
		});
		const s = await saved(o.id);
		expect(s.items[1]).toMatchObject({
			product_sku: 'ACP-FRITAS',
			line_total_cents: 1490,
			discount_cents: 1490
		});
		expect(s.discount_cents).toBe(1490);
		expect(s.total_cents).toBe(2 * 2890);
		// Without the second burger the offer does not apply.
		expect((await saved((await order()).id)).discount_cents).toBe(0);
	});

	it('picks the biggest discount when a code and an automatic offer both apply', async () => {
		await campaign({ autoApply: true, params: { benefit: { type: 'fixed', amountCents: 500 } } });
		const c = code();
		await campaign({ code: c, params: { benefit: { type: 'fixed', amountCents: 300 } } });
		const o = await order({ couponCode: c });
		const s = await saved(o.id);
		expect(s.discount_cents).toBe(500);
		expect(s.coupon_id).toBeNull();
	});

	it('lets a manual staff discount replace any campaign', async () => {
		await campaign({ autoApply: true });
		const s = await saved((await order({ discountCents: 100 })).id);
		expect(s.discount_cents).toBe(100);
		expect(s.campaign_id).toBeNull();
	});
});

describe('limits', () => {
	it('holds a single-use code under concurrency, and gives it back when the order is cancelled', async () => {
		const c = code();
		await campaign({ code: c, maxUsesTotal: 1 });
		const results = await Promise.allSettled([order({ couponCode: c }), order({ couponCode: c })]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
		expect(String(rejected.reason)).toMatch(/máximo de vezes/);

		const used = results.find((r) => r.status === 'fulfilled') as PromiseFulfilledResult<{
			id: string;
		}>;
		await transitionOrder({
			orderId: used.value.id,
			to: 'cancelled',
			actor: admin,
			reason: 'Teste'
		});
		expect((await saved((await order({ couponCode: c })).id)).discount_cents).toBeGreaterThan(0);
	});

	it('first order and per-customer limits need a known customer', async () => {
		const c = code();
		await campaign({ code: c, firstOrderOnly: true });
		await expect(order({ couponCode: c })).rejects.toThrow(/telefone/);
		const phone = `+55119${Math.floor(Math.random() * 1e8)
			.toString()
			.padStart(8, '0')}`;
		expect(
			(await saved((await order({ couponCode: c, phone })).id)).discount_cents
		).toBeGreaterThan(0);
		await expect(order({ couponCode: c, phone })).rejects.toThrow(/primeiro pedido/);
	});
});

describe('results', () => {
	it('counts uses, discount, revenue and new customers per campaign', async () => {
		const c = code();
		const id = await campaign({
			code: c,
			params: { benefit: { type: 'fixed', amountCents: 1000 } }
		});
		const phone = `+55118${Math.floor(Math.random() * 1e8)
			.toString()
			.padStart(8, '0')}`;
		await order({ couponCode: c, phone });
		const cancelled = await order({ couponCode: c });
		await transitionOrder({
			orderId: cancelled.id,
			to: 'cancelled',
			actor: admin,
			reason: 'Teste'
		});
		const rows = await campaignResults(
			new Date(Date.now() - 60_000),
			new Date(Date.now() + 60_000)
		);
		const row = rows.find((r) => r.id === id)!;
		expect(row).toMatchObject({
			uses: 1,
			discountCents: 1000,
			revenueCents: 2890 + 1490 - 1000,
			newCustomers: 1,
			code: c
		});
	});
});
