// Campaign rules. A campaign is a template (from this file) plus its params,
// dates and time windows. This module is pure: it says whether a campaign is
// live, what it would give a cart, and which offer wins. Limits that need the
// database (uses, first order) are checked by the server service.
import { z } from 'zod';
import { isOpenAt, isTime } from './hours';

export type BenefitType = 'percent' | 'fixed' | 'free_delivery' | 'free_items';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'ended';

const hhmm = z.string().refine(isTime, 'Horário inválido');

/** "Tuesday and Thursday, 18:00–20:00" in shop time. An end before the start runs past midnight. */
export const timeWindow = z.object({
	days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
	start: hhmm,
	end: hhmm
});
export type TimeWindow = z.infer<typeof timeWindow>;

const cents = z.number().int().positive().max(1_000_000);

const itemScope = z.object({
	type: z.enum(['all', 'products', 'categories']),
	ids: z.array(z.string().min(1)).max(100).default([])
});

export const codeDiscountParams = z.object({
	benefit: z.discriminatedUnion('type', [
		z.object({
			type: z.literal('percent'),
			percent: z.number().int().min(1).max(100),
			maxDiscountCents: cents.nullable().default(null)
		}),
		z.object({ type: z.literal('fixed'), amountCents: cents }),
		z.object({ type: z.literal('free_delivery') })
	])
});

/**
 * Buy X get Y. The reward item must be in the cart: the customer adds the free
 * fries, the campaign gives them away. A "min_order" trigger is a gift with
 * purchase (spend the campaign's minimum, get the item).
 */
export const buyXGetYParams = z.object({
	trigger: z.discriminatedUnion('kind', [
		z.object({
			kind: z.literal('quantity'),
			scope: itemScope,
			quantity: z.number().int().min(1).max(20)
		}),
		z.object({ kind: z.literal('min_order') })
	]),
	reward: z.object({
		scope: z.object({
			type: z.enum(['same', 'products', 'categories']),
			ids: z.array(z.string().min(1)).max(100).default([])
		}),
		quantity: z.number().int().min(1).max(10),
		/** 100 = free. */
		percent: z.number().int().min(1).max(100).default(100),
		target: z.enum(['cheapest', 'most_expensive']).default('cheapest')
	}),
	maxRewardsPerOrder: z.number().int().min(1).max(20).default(1)
});

const benefit = codeDiscountParams.shape.benefit;
export type CouponBenefit = z.infer<typeof benefit>;
const couponDays = z.number().int().min(1).max(365).default(30);

/** Every N counted orders, the customer gets a coupon. */
export const loyaltyParams = z.object({
	every: z.number().int().min(2).max(50),
	benefit,
	couponDays
});
/** A friend's first order gets `benefit` with the customer's link; the customer then gets `reward`. */
export const referralParams = z.object({ benefit, reward: benefit, couponDays });
/** A coupon valid for the customer's birthday week. */
export const birthdayParams = z.object({ benefit });

export const TEMPLATES = {
	code_discount: { label: 'Desconto no pedido', params: codeDiscountParams },
	buy_x_get_y: { label: 'Leve X, ganhe Y', params: buyXGetYParams },
	loyalty_stamps: { label: 'Cartão fidelidade', params: loyaltyParams },
	referral: { label: 'Indique um amigo', params: referralParams },
	birthday: { label: 'Aniversário', params: birthdayParams }
} as const;

/** Campaigns that reach customers only through coupons issued to them, never a shared code. */
export const MILESTONE_TEMPLATES = ['loyalty_stamps', 'referral', 'birthday'] as const;
export type MilestoneTemplate = (typeof MILESTONE_TEMPLATES)[number];
export const isMilestoneTemplate = (k: string): k is MilestoneTemplate =>
	(MILESTONE_TEMPLATES as readonly string[]).includes(k);

/** Stamps on the card towards the next coupon. */
export function stampProgress(counted: number, every: number) {
	return { stamps: counted % every, every, earned: Math.floor(counted / every) };
}
export type TemplateKey = keyof typeof TEMPLATES;
export const isTemplateKey = (k: string): k is TemplateKey => k in TEMPLATES;

export type CodeDiscountParams = z.infer<typeof codeDiscountParams>;
export type BuyXGetYParams = z.infer<typeof buyXGetYParams>;

export function benefitTypeOf(key: TemplateKey, params: unknown): BenefitType {
	if (key === 'buy_x_get_y') return 'free_items';
	if (key === 'code_discount') return codeDiscountParams.parse(params).benefit.type;
	return TEMPLATES[key].params.parse(params).benefit.type;
}

/** Why an offer does not apply. The checkout turns these into the shop's own words. */
export type OfferProblem =
	| 'not_found'
	| 'inactive'
	| 'not_started'
	| 'expired'
	| 'outside_hours'
	| 'min_order'
	| 'needs_customer'
	| 'other_customer'
	| 'used_up'
	| 'already_used'
	| 'first_order_only'
	| 'delivery_only'
	| 'needs_more_items'
	| 'no_reward_item'
	| 'better_offer';

export interface CampaignRule {
	id: string;
	templateKey: string;
	status: CampaignStatus;
	startsAt: Date | null;
	endsAt: Date | null;
	timeWindows: TimeWindow[];
	params: unknown;
	minOrderCents: number;
	/** The kind of the typed coupon (a referral reward uses the referral's reward). */
	couponKind?: string;
}

export interface EvalLine {
	position: number;
	sku: string;
	categoryId: string | null;
	quantity: number;
	/** Product price without paid add-ons: add-ons on a free item are still charged. */
	unitPriceCents: number;
	lineTotalCents: number;
}

export interface EvalCart {
	lines: EvalLine[];
	subtotalCents: number;
	deliveryFeeCents: number;
}

export type Benefit =
	| { ok: true; discountCents: number; lineDiscounts: Record<number, number> }
	| { ok: false; problem: OfferProblem };

/** Dates, status and time windows. */
export function liveProblem(c: CampaignRule, now: Date): OfferProblem | null {
	if (c.status !== 'active') return 'inactive';
	if (c.startsAt && now < c.startsAt) return 'not_started';
	if (c.endsAt && now >= c.endsAt) return 'expired';
	if (c.timeWindows.length && !inWindows(c.timeWindows, now)) return 'outside_hours';
	return null;
}

export function inWindows(windows: TimeWindow[], now: Date): boolean {
	return isOpenAt(
		{
			enabled: true,
			closedDates: [],
			days: windows.flatMap((w) =>
				w.days.map((weekday) => ({ weekday, opens: w.start, closes: w.end }))
			)
		},
		now
	);
}

/** What the campaign gives this cart, ignoring limits kept in the database. */
export function computeBenefit(c: CampaignRule, cart: EvalCart): Benefit {
	if (cart.subtotalCents < c.minOrderCents) return { ok: false, problem: 'min_order' };
	if (c.templateKey === 'code_discount' || isMilestoneTemplate(c.templateKey)) {
		const benefit = benefitOf(c);
		let discount: number;
		if (benefit.type === 'percent') {
			discount = Math.floor((cart.subtotalCents * benefit.percent) / 100);
			if (benefit.maxDiscountCents) discount = Math.min(discount, benefit.maxDiscountCents);
		} else if (benefit.type === 'fixed') {
			discount = benefit.amountCents;
		} else {
			if (cart.deliveryFeeCents <= 0) return { ok: false, problem: 'delivery_only' };
			discount = cart.deliveryFeeCents;
		}
		return { ok: true, discountCents: Math.min(discount, cart.subtotalCents), lineDiscounts: {} };
	}
	if (c.templateKey === 'buy_x_get_y') return buyXGetY(buyXGetYParams.parse(c.params), cart);
	return { ok: false, problem: 'inactive' };
}

function benefitOf(c: CampaignRule): CouponBenefit {
	if (c.templateKey === 'referral') {
		const p = referralParams.parse(c.params);
		return c.couponKind === 'referral_reward' ? p.reward : p.benefit;
	}
	if (c.templateKey === 'loyalty_stamps') return loyaltyParams.parse(c.params).benefit;
	if (c.templateKey === 'birthday') return birthdayParams.parse(c.params).benefit;
	return codeDiscountParams.parse(c.params).benefit;
}

/** The benefit in a few words ("10% off", "R$ 5,00 off", "free delivery"), for messages. */
export function describeBenefit(b: CouponBenefit, formatMoney: (cents: number) => string): string {
	if (b.type === 'percent') return `${b.percent}% de desconto`;
	if (b.type === 'fixed') return `${formatMoney(b.amountCents)} de desconto`;
	return 'entrega grátis';
}

function inScope(line: EvalLine, scope: { type: string; ids: string[] }) {
	if (scope.type === 'all') return true;
	if (scope.type === 'products') return scope.ids.includes(line.sku);
	return line.categoryId !== null && scope.ids.includes(line.categoryId);
}

function buyXGetY(p: BuyXGetYParams, cart: EvalCart): Benefit {
	// One entry per unit, so "2 burgers in one line" counts as two.
	const units = (pred: (l: EvalLine) => boolean) =>
		cart.lines.filter(pred).flatMap((l) => Array.from({ length: l.quantity }, () => l));

	let rewardPool: EvalLine[];
	let rewards: number;
	if (p.trigger.kind === 'quantity') {
		const trigger = p.trigger;
		const triggerUnits = units((l) => inScope(l, trigger.scope));
		if (p.reward.scope.type === 'same') {
			// Buy 2 get 1: every 3 units in scope, 1 of them is the reward.
			rewardPool = triggerUnits;
			rewards = Math.floor(triggerUnits.length / (trigger.quantity + p.reward.quantity));
		} else {
			const scope = p.reward.scope;
			rewardPool = units((l) => inScope(l, scope));
			rewards = Math.floor(triggerUnits.length / trigger.quantity);
		}
	} else {
		const scope = p.reward.scope;
		rewardPool = units((l) => scope.type === 'same' || inScope(l, scope));
		rewards = 1;
	}
	const count = Math.min(rewards, p.maxRewardsPerOrder) * p.reward.quantity;
	if (count === 0) return { ok: false, problem: 'needs_more_items' };
	if (rewardPool.length === 0) return { ok: false, problem: 'no_reward_item' };

	const sorted = [...rewardPool].sort((a, b) =>
		p.reward.target === 'cheapest'
			? a.unitPriceCents - b.unitPriceCents
			: b.unitPriceCents - a.unitPriceCents
	);
	const lineDiscounts: Record<number, number> = {};
	let total = 0;
	for (const unit of sorted.slice(0, count)) {
		const off = Math.floor((unit.unitPriceCents * p.reward.percent) / 100);
		lineDiscounts[unit.position] = (lineDiscounts[unit.position] ?? 0) + off;
		total += off;
	}
	if (total === 0) return { ok: false, problem: 'no_reward_item' };
	return { ok: true, discountCents: Math.min(total, cart.subtotalCents), lineDiscounts };
}

export interface Candidate {
	campaignId: string;
	discountCents: number;
	/** The customer typed this one's code. */
	typed: boolean;
}

/** One discount per order: the biggest wins, and a typed code wins a tie. */
export function pickBest<T extends Candidate>(candidates: T[]): T | null {
	let best: T | null = null;
	for (const c of candidates) {
		if (c.discountCents <= 0) continue;
		if (
			!best ||
			c.discountCents > best.discountCents ||
			(c.discountCents === best.discountCents && c.typed && !best.typed)
		)
			best = c;
	}
	return best;
}

export function normalizeCode(raw: string): string {
	return raw.trim().toUpperCase().replace(/\s+/g, '');
}
