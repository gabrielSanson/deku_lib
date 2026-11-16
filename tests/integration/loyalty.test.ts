// S3.4: loyalty coupons exactly once per milestone under retries, referral reward on a friend's
// first paid order, birthday coupon for the birthday week.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findOffer } from '#lib/server/campaigns/service.ts';
import {
	customerRewards,
	issueBirthdayCoupons,
	nextBirthday,
	processMilestones,
	referralCode,
	saveMilestone
} from '#lib/server/campaigns/milestones.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { classic, ensureCashOpen, makeStaff } from './helpers.ts';

let manager: Awaited<ReturnType<typeof makeStaff>>;
const owner = () => ({ type: 'staff' as const, id: manager.id });
const phone = () => `+55119${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;

async function paidOrder(p: string, couponCode?: string) {
	const o = await createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [classic],
		fulfillmentType: 'counter',
		customer: { name: 'Gabi Fiel', phoneE164: p },
		couponCode: couponCode ?? null,
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		paymentStatus: 'paid',
		actor: manager
	});
	return o;
}

async function customerId(p: string) {
	const [c] = await db()<{ id: string }[]>`select id from customers where phone_e164 = ${p}`;
	return c.id;
}

async function couponsOf(id: string, kind: string) {
	return db()<{ code: string; milestone_at: number | null }[]>`
		select code, milestone_at from coupons where customer_id = ${id} and kind = ${kind}
		order by milestone_at`;
}

beforeAll(async () => {
	manager = await makeStaff('admin');
	await ensureCashOpen(manager);
});

afterAll(async () => {
	await db()`update campaigns set status = 'paused'
		where template_key in ('loyalty_stamps', 'referral', 'birthday')`;
	await stopBoss();
	await closeDb();
});

describe('loyalty card', () => {
	it('issues the coupon exactly once on the 3rd paid order, even when jobs repeat', async () => {
		await saveMilestone(
			'loyalty_stamps',
			{ active: true, params: { every: 3, benefit: { type: 'fixed', amountCents: 1000 } } },
			owner()
		);
		const p = phone();
		const orders = [];
		for (let i = 0; i < 3; i++) orders.push(await paidOrder(p));
		const id = await customerId(p);
		// Jobs run late, twice, in any order.
		await Promise.all(orders.map((o) => processMilestones(o.id)));
		await processMilestones(orders[2].id);
		await processMilestones(orders[0].id);
		const coupons = await couponsOf(id, 'loyalty');
		expect(coupons.map((c) => c.milestone_at)).toEqual([3]);
		const rewards = await customerRewards(id);
		expect(rewards.stamps).toMatchObject({ stamps: 0, every: 3 });
		expect(rewards.coupons.map((c) => c.code)).toEqual([coupons[0].code]);

		// The coupon belongs to that customer only.
		const cart = { subtotalCents: 3000, deliveryFeeCents: 0, lines: [] };
		const mine = await findOffer(db(), { cart, customerId: id, couponCode: coupons[0].code });
		expect(mine.applied?.discountCents).toBe(1000);
		const other = await findOffer(db(), { cart, customerId: null, couponCode: coupons[0].code });
		expect(other.couponProblem).toBe('needs_customer');
	});
});

describe('referral', () => {
	it("rewards the referrer once the friend's first order is paid", async () => {
		await saveMilestone(
			'referral',
			{
				active: true,
				params: {
					benefit: { type: 'percent', percent: 10, maxDiscountCents: null },
					reward: { type: 'fixed', amountCents: 800 }
				}
			},
			owner()
		);
		const referrerPhone = phone();
		await paidOrder(referrerPhone);
		const referrer = await customerId(referrerPhone);
		const code = (await referralCode(referrer))!;
		expect(code).toMatch(/^AMIGO/);
		expect(await referralCode(referrer)).toBe(code);

		// The referrer can't use their own link.
		const cart = { subtotalCents: 3000, deliveryFeeCents: 0, lines: [] };
		expect(
			(await findOffer(db(), { cart, customerId: referrer, couponCode: code })).couponProblem
		).toBe('other_customer');

		const friendPhone = phone();
		const first = await paidOrder(friendPhone, code);
		const [o] = await db()<{ coupon_id: string | null; discount_cents: number }[]>`
			select coupon_id, discount_cents from orders where id = ${first.id}`;
		expect(o.coupon_id).not.toBeNull();
		await processMilestones(first.id);
		await processMilestones(first.id);
		expect(await couponsOf(referrer, 'referral_reward')).toHaveLength(1);

		// A second order by the same friend can't use the welcome code again.
		const friend = await customerId(friendPhone);
		expect(
			(await findOffer(db(), { cart, customerId: friend, couponCode: code })).couponProblem
		).toBe('first_order_only');
	});
});

describe('birthday', () => {
	it('finds the next birthday, including 29 February', () => {
		const now = new Date('2026-11-16T12:00:00Z');
		expect(nextBirthday('1990-11-20', now).toISOString().slice(0, 10)).toBe('2026-11-20');
		expect(nextBirthday('1990-11-10', now).toISOString().slice(0, 10)).toBe('2027-11-10');
		expect(nextBirthday('2000-02-29', now).toISOString().slice(0, 10)).toBe('2027-02-28');
	});

	it('issues one coupon in the birthday week', async () => {
		await saveMilestone(
			'birthday',
			{ active: true, params: { benefit: { type: 'free_delivery' } } },
			owner()
		);
		const p = phone();
		await paidOrder(p);
		const id = await customerId(p);
		const soon = new Date(Date.now() + 3 * 86400_000).toISOString().slice(5, 10);
		await db()`update customers set birthday = ${'1995-' + soon} where id = ${id}`;
		await issueBirthdayCoupons();
		await issueBirthdayCoupons();
		expect(await couponsOf(id, 'birthday')).toHaveLength(1);
	});
});
