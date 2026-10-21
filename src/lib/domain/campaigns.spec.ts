import { describe, expect, it } from 'vitest';
import {
	computeBenefit,
	inWindows,
	liveProblem,
	normalizeCode,
	pickBest,
	type CampaignRule,
	type EvalCart
} from './campaigns';

const rule = (over: Partial<CampaignRule>): CampaignRule => ({
	id: 'c1',
	templateKey: 'code_discount',
	status: 'active',
	startsAt: null,
	endsAt: null,
	timeWindows: [],
	params: { benefit: { type: 'percent', percent: 10 } },
	minOrderCents: 0,
	...over
});

// 2 burgers at R$ 30 (one with R$ 5 of add-ons each), 1 fries at R$ 12.
const cart: EvalCart = {
	subtotalCents: 2 * 3500 + 1200,
	deliveryFeeCents: 800,
	lines: [
		{
			position: 1,
			sku: 'BURGER',
			categoryId: 'burgers',
			quantity: 2,
			unitPriceCents: 3000,
			lineTotalCents: 7000
		},
		{
			position: 2,
			sku: 'FRIES',
			categoryId: 'sides',
			quantity: 1,
			unitPriceCents: 1200,
			lineTotalCents: 1200
		}
	]
};

describe('order discounts', () => {
	it('takes a percentage of the food only, rounded down and capped', () => {
		expect(computeBenefit(rule({}), cart)).toMatchObject({ ok: true, discountCents: 820 });
		const capped = rule({
			params: { benefit: { type: 'percent', percent: 50, maxDiscountCents: 1000 } }
		});
		expect(computeBenefit(capped, cart)).toMatchObject({ ok: true, discountCents: 1000 });
	});

	it('never discounts more than the food', () => {
		const big = rule({ params: { benefit: { type: 'fixed', amountCents: 50_000 } } });
		expect(computeBenefit(big, cart)).toMatchObject({ ok: true, discountCents: 8200 });
	});

	it('gives free delivery only when there is a fee', () => {
		const free = rule({ params: { benefit: { type: 'free_delivery' } } });
		expect(computeBenefit(free, cart)).toMatchObject({ ok: true, discountCents: 800 });
		expect(computeBenefit(free, { ...cart, deliveryFeeCents: 0 })).toEqual({
			ok: false,
			problem: 'delivery_only'
		});
	});

	it('checks the minimum on the food before the discount', () => {
		expect(computeBenefit(rule({ minOrderCents: 8200 }), cart).ok).toBe(true);
		expect(computeBenefit(rule({ minOrderCents: 8201 }), cart)).toEqual({
			ok: false,
			problem: 'min_order'
		});
	});
});

describe('buy X get Y', () => {
	const bxgy = (params: object) => rule({ templateKey: 'buy_x_get_y', params });

	it('buy 2 get 1 of the same: needs 3 units, the cheapest is free, add-ons still charged', () => {
		const offer = bxgy({
			trigger: { kind: 'quantity', scope: { type: 'all' }, quantity: 2 },
			reward: { scope: { type: 'same' }, quantity: 1 }
		});
		// 3 units: the fries (R$ 12) are the cheapest.
		expect(computeBenefit(offer, cart)).toEqual({
			ok: true,
			discountCents: 1200,
			lineDiscounts: { 2: 1200 }
		});
		const burgersOnly = bxgy({
			trigger: { kind: 'quantity', scope: { type: 'categories', ids: ['burgers'] }, quantity: 2 },
			reward: { scope: { type: 'same' }, quantity: 1 }
		});
		expect(computeBenefit(burgersOnly, cart)).toEqual({ ok: false, problem: 'needs_more_items' });
	});

	it('buy 2 burgers, get the fries free', () => {
		const offer = bxgy({
			trigger: { kind: 'quantity', scope: { type: 'products', ids: ['BURGER'] }, quantity: 2 },
			reward: { scope: { type: 'products', ids: ['FRIES'] }, quantity: 1 }
		});
		expect(computeBenefit(offer, cart)).toMatchObject({
			ok: true,
			discountCents: 1200,
			lineDiscounts: { 2: 1200 }
		});
		const noFries = { ...cart, lines: [cart.lines[0]], subtotalCents: 7000 };
		expect(computeBenefit(offer, noFries)).toEqual({ ok: false, problem: 'no_reward_item' });
	});

	it('gift with purchase uses the campaign minimum', () => {
		const gift = rule({
			templateKey: 'buy_x_get_y',
			minOrderCents: 8000,
			params: {
				trigger: { kind: 'min_order' },
				reward: { scope: { type: 'categories', ids: ['sides'] }, quantity: 1 }
			}
		});
		expect(computeBenefit(gift, cart)).toMatchObject({ ok: true, discountCents: 1200 });
		expect(computeBenefit({ ...gift, minOrderCents: 9000 }, cart)).toEqual({
			ok: false,
			problem: 'min_order'
		});
	});

	it('half price on the most expensive burger, at most once', () => {
		const offer = bxgy({
			trigger: { kind: 'quantity', scope: { type: 'all' }, quantity: 1 },
			reward: {
				scope: { type: 'products', ids: ['BURGER'] },
				quantity: 1,
				percent: 50,
				target: 'most_expensive'
			}
		});
		expect(computeBenefit(offer, cart)).toMatchObject({
			ok: true,
			discountCents: 1500,
			lineDiscounts: { 1: 1500 }
		});
	});
});

describe('when a campaign is live', () => {
	const now = new Date('2026-10-21T21:30:00Z'); // Wednesday 18:30 in São Paulo

	it('respects status and dates', () => {
		expect(liveProblem(rule({}), now)).toBeNull();
		expect(liveProblem(rule({ status: 'paused' }), now)).toBe('inactive');
		expect(liveProblem(rule({ startsAt: new Date('2026-10-22T00:00:00Z') }), now)).toBe(
			'not_started'
		);
		expect(liveProblem(rule({ endsAt: now }), now)).toBe('expired');
	});

	it('respects time windows in shop time, including past midnight', () => {
		expect(inWindows([{ days: [3], start: '18:00', end: '20:00' }], now)).toBe(true);
		expect(inWindows([{ days: [4], start: '18:00', end: '20:00' }], now)).toBe(false);
		// Tuesday 22:00–02:00 still runs at Wednesday 01:00.
		expect(
			inWindows([{ days: [2], start: '22:00', end: '02:00' }], new Date('2026-10-21T04:00:00Z'))
		).toBe(true);
		expect(
			liveProblem(rule({ timeWindows: [{ days: [0], start: '11:00', end: '15:00' }] }), now)
		).toBe('outside_hours');
	});
});

describe('picking the offer', () => {
	it('takes the biggest discount, and a typed code wins a tie', () => {
		const auto = { campaignId: 'a', discountCents: 500, typed: false };
		const typed = { campaignId: 'b', discountCents: 500, typed: true };
		expect(pickBest([auto, typed])?.campaignId).toBe('b');
		expect(pickBest([typed, { ...auto, discountCents: 600 }])?.campaignId).toBe('a');
		expect(pickBest([{ ...auto, discountCents: 0 }])).toBeNull();
	});

	it('normalizes codes', () => {
		expect(normalizeCode('  sexta 15 ')).toBe('SEXTA15');
	});
});
