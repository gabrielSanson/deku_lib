// Campaigns in the database: which offer an order gets, the admin's edits and
// the results table. Uses are counted from orders (order_counts_for_offer), so
// there is no counter to drift; the order transaction locks the campaign and
// coupon rows while it counts.
import { z } from 'zod';
import {
	benefitTypeOf,
	computeBenefit,
	isTemplateKey,
	liveProblem,
	normalizeCode,
	pickBest,
	TEMPLATES,
	timeWindow,
	type CampaignRule,
	type CampaignStatus,
	type EvalCart,
	type OfferProblem,
	type TemplateKey,
	type TimeWindow
} from '#lib/domain/campaigns.ts';
import type { Catalog } from '#lib/domain/catalog.ts';
import { formatBRL } from '#lib/domain/money.ts';
import type { PricedCart } from '#lib/domain/pricing.ts';
import { fill, type TextKey, type Texts } from '#lib/texts/catalog.ts';
import { audit, type Actor } from '../audit';
import { db, type Db } from '../db';
import { DomainError } from '../errors';

interface CampaignRow {
	id: string;
	template_key: string;
	name: string;
	status: CampaignStatus;
	starts_at: Date | null;
	ends_at: Date | null;
	time_windows: TimeWindow[];
	params: unknown;
	auto_apply: boolean;
	benefit_type: string;
	min_order_cents: number;
	max_uses_total: number | null;
	max_uses_per_customer: number | null;
	first_order_only: boolean;
}

function toRule(r: CampaignRow): CampaignRule {
	return {
		id: r.id,
		templateKey: r.template_key,
		status: r.status,
		startsAt: r.starts_at,
		endsAt: r.ends_at,
		timeWindows: r.time_windows,
		params: r.params,
		minOrderCents: r.min_order_cents
	};
}

/** Cart lines with the category each product belongs to, for category-wide offers. */
export function evalCart(catalog: Catalog, cart: PricedCart, deliveryFeeCents: number): EvalCart {
	const categoryOf = new Map(catalog.products.map((p) => [p.sku, p.categoryId]));
	return {
		subtotalCents: cart.subtotalCents,
		deliveryFeeCents,
		lines: cart.lines.map((l) => ({
			position: l.position,
			sku: l.productSku,
			categoryId: categoryOf.get(l.productSku) ?? null,
			quantity: l.quantity,
			unitPriceCents: l.unitPriceCents,
			lineTotalCents: l.lineTotalCents
		}))
	};
}

export interface AppliedOffer {
	campaignId: string;
	couponId: string | null;
	name: string;
	discountCents: number;
	/** Discount per cart line position, for free or discounted items. */
	lineDiscounts: Record<number, number>;
}

export interface OfferResult {
	applied: AppliedOffer | null;
	/** Why the typed code is not the one applied. */
	couponProblem: OfferProblem | null;
	/** The minimum order, when the problem is min_order. */
	couponMinOrderCents?: number;
}

export interface OfferInput {
	cart: EvalCart;
	/** Known customer (web phone or, later, an account). Null = anonymous. */
	customerId: string | null;
	couponCode?: string | null;
	now?: Date;
	/** Inside the order transaction: lock rows so limits hold under concurrency. */
	lock?: boolean;
}

/** The best offer for a cart: every automatic campaign plus the typed code, one discount per order. */
export async function findOffer(sql: Db, input: OfferInput): Promise<OfferResult> {
	const now = input.now ?? new Date();
	const code = input.couponCode ? normalizeCode(input.couponCode) : '';

	let coupon:
		| {
				id: string;
				campaign_id: string;
				customer_id: string | null;
				expires_at: Date | null;
				max_uses: number | null;
				active: boolean;
		  }
		| undefined;
	let couponProblem: OfferProblem | null = null;
	if (code) {
		[coupon] = await sql<NonNullable<typeof coupon>[]>`
			select id, campaign_id, customer_id, expires_at, max_uses, active from coupons where code = ${code}`;
		if (!coupon) couponProblem = 'not_found';
		else if (!coupon.active) couponProblem = 'inactive';
		else if (coupon.expires_at && now >= coupon.expires_at) couponProblem = 'expired';
		else if (coupon.customer_id && coupon.customer_id !== input.customerId)
			couponProblem = coupon.customer_id && !input.customerId ? 'needs_customer' : 'other_customer';
	}
	const typedCampaign = coupon && !couponProblem ? coupon.campaign_id : null;

	const rows = await sql<CampaignRow[]>`
		select * from campaigns
		where (status = 'active' and auto_apply) or id = ${typedCampaign}
		order by created_at`;

	type Scored = AppliedOffer & { typed: boolean; row: CampaignRow };
	const scored: Scored[] = [];
	let couponMinOrderCents: number | undefined;
	for (const row of rows) {
		const typed = row.id === typedCampaign;
		const rule = toRule(row);
		const problem = liveProblem(rule, now) ?? (await limitProblem(sql, row, input.customerId));
		const benefit = problem ? null : computeBenefit(rule, input.cart);
		if (typed && (problem || !benefit?.ok)) {
			couponProblem = problem ?? (benefit && !benefit.ok ? benefit.problem : 'inactive');
			if (couponProblem === 'min_order') couponMinOrderCents = row.min_order_cents;
			continue;
		}
		if (!benefit?.ok) continue;
		// A typed code reaches only its own campaign's coupon; automatic offers have none.
		scored.push({
			campaignId: row.id,
			couponId: typed ? coupon!.id : null,
			name: row.name,
			discountCents: benefit.discountCents,
			lineDiscounts: benefit.lineDiscounts,
			typed,
			row
		});
	}

	// Under lock, re-check the winner's limits; if it was used up meanwhile, try the next.
	const ordered = [...scored].sort((a, b) => b.discountCents - a.discountCents);
	let applied: Scored | null = pickBest(ordered);
	if (input.lock) {
		applied = null;
		for (const cand of rankOrder(ordered)) {
			await sql`select id from campaigns where id = ${cand.campaignId} for update`;
			if (cand.couponId) await sql`select id from coupons where id = ${cand.couponId} for update`;
			const again = await limitProblem(sql, cand.row, input.customerId);
			const couponFull = cand.couponId ? await couponUsedUp(sql, cand.couponId) : false;
			if (!again && !couponFull) {
				applied = cand;
				break;
			}
			if (cand.typed) couponProblem = again ?? 'used_up';
		}
	} else if (applied?.couponId && (await couponUsedUp(sql, applied.couponId))) {
		couponProblem = 'used_up';
		applied = pickBest(ordered.filter((c) => !c.typed));
	}

	if (code && !couponProblem && applied && !applied.typed) couponProblem = 'better_offer';
	return {
		applied: applied
			? {
					campaignId: applied.campaignId,
					couponId: applied.couponId,
					name: applied.name,
					discountCents: applied.discountCents,
					lineDiscounts: applied.lineDiscounts
				}
			: null,
		couponProblem,
		couponMinOrderCents
	};
}

/** Candidates in the order pickBest would choose them. */
function rankOrder<T extends { discountCents: number; typed: boolean }>(list: T[]): T[] {
	return [...list].sort(
		(a, b) => b.discountCents - a.discountCents || Number(b.typed) - Number(a.typed)
	);
}

async function couponUsedUp(sql: Db, couponId: string): Promise<boolean> {
	const [r] = await sql<{ max_uses: number | null; uses: number }[]>`
		select c.max_uses, (select count(*)::int from orders o
			where o.coupon_id = c.id and order_counts_for_offer(o.status, o.payment_status)) as uses
		from coupons c where c.id = ${couponId}`;
	return r.max_uses !== null && r.uses >= r.max_uses;
}

/** Limits that need the order history: total uses, uses per customer, first order. */
async function limitProblem(
	sql: Db,
	c: CampaignRow,
	customerId: string | null
): Promise<OfferProblem | null> {
	if (c.max_uses_total !== null) {
		const [{ n }] = await sql<{ n: number }[]>`
			select count(*)::int as n from orders
			where campaign_id = ${c.id} and order_counts_for_offer(status, payment_status)`;
		if (n >= c.max_uses_total) return 'used_up';
	}
	if (c.max_uses_per_customer !== null || c.first_order_only) {
		// Per-customer rules need to know who is ordering: an anonymous counter sale can't use them.
		if (!customerId) return 'needs_customer';
		const [{ mine, any }] = await sql<{ mine: number; any: number }[]>`
			select count(*) filter (where campaign_id = ${c.id})::int as mine, count(*)::int as any
			from orders where customer_id = ${customerId} and order_counts_for_offer(status, payment_status)`;
		if (c.first_order_only && any > 0) return 'first_order_only';
		if (c.max_uses_per_customer !== null && mine >= c.max_uses_per_customer) return 'already_used';
	}
	return null;
}

/** The shop's words for why a code didn't apply. */
export function offerMessage(texts: Texts, problem: OfferProblem, minOrderCents = 0): string {
	return fill(texts[`coupon.${problem}` as TextKey], { amount: formatBRL(minOrderCents) });
}

export async function customerIdByPhone(sql: Db, phoneE164: string | null): Promise<string | null> {
	if (!phoneE164) return null;
	const [r] = await sql<{ id: string }[]>`
		select id from customers where phone_e164 = ${phoneE164} and deleted_at is null`;
	return r?.id ?? null;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const optionalCount = z.number().int().positive().max(1_000_000).nullable();

export const campaignInput = z
	.object({
		name: z.string().trim().min(1).max(80),
		templateKey: z.string().refine(isTemplateKey, 'Tipo inválido'),
		params: z.unknown(),
		code: z
			.string()
			.transform(normalizeCode)
			.refine((c) => c === '' || /^[A-Z0-9_-]{3,24}$/.test(c), {
				message: 'O código deve ter de 3 a 24 letras, números, - ou _.'
			})
			.default(''),
		autoApply: z.boolean().default(false),
		startsAt: z.coerce.date().nullable().default(null),
		endsAt: z.coerce.date().nullable().default(null),
		timeWindows: z.array(timeWindow).max(14).default([]),
		minOrderCents: z.number().int().min(0).max(1_000_000).default(0),
		maxUsesTotal: optionalCount.default(null),
		maxUsesPerCustomer: optionalCount.default(null),
		firstOrderOnly: z.boolean().default(false),
		activate: z.boolean().default(false)
	})
	.superRefine((v, ctx) => {
		if (!v.autoApply && !v.code)
			ctx.addIssue({
				code: 'custom',
				path: ['code'],
				message: 'Informe o código do cupom ou marque "aplicar sozinho".'
			});
		if (v.startsAt && v.endsAt && v.endsAt <= v.startsAt)
			ctx.addIssue({
				code: 'custom',
				path: ['endsAt'],
				message: 'O fim deve ser depois do início.'
			});
		if (isTemplateKey(v.templateKey)) {
			const res = TEMPLATES[v.templateKey].params.safeParse(v.params);
			if (!res.success)
				ctx.addIssue({
					code: 'custom',
					path: ['params'],
					message: 'Revise as regras da promoção.'
				});
		}
	});
export type CampaignInput = z.input<typeof campaignInput>;

export interface CampaignDetail {
	id: string;
	name: string;
	templateKey: TemplateKey;
	status: CampaignStatus;
	params: unknown;
	code: string;
	autoApply: boolean;
	startsAt: Date | null;
	endsAt: Date | null;
	timeWindows: TimeWindow[];
	minOrderCents: number;
	maxUsesTotal: number | null;
	maxUsesPerCustomer: number | null;
	firstOrderOnly: boolean;
	uses: number;
}

export async function getCampaign(id: string, sql: Db = db()): Promise<CampaignDetail | null> {
	const [r] = await sql<(CampaignRow & { code: string | null; uses: number })[]>`
		select c.*,
			(select code from coupons where campaign_id = c.id and kind = 'manual' order by created_at limit 1) as code,
			(select count(*)::int from orders o where o.campaign_id = c.id
				and order_counts_for_offer(o.status, o.payment_status)) as uses
		from campaigns c where c.id = ${id}`;
	if (!r || !isTemplateKey(r.template_key)) return null;
	return {
		id: r.id,
		name: r.name,
		templateKey: r.template_key,
		status: r.status,
		params: r.params,
		code: r.code ?? '',
		autoApply: r.auto_apply,
		startsAt: r.starts_at,
		endsAt: r.ends_at,
		timeWindows: r.time_windows,
		minOrderCents: r.min_order_cents,
		maxUsesTotal: r.max_uses_total,
		maxUsesPerCustomer: r.max_uses_per_customer,
		firstOrderOnly: r.first_order_only,
		uses: r.uses
	};
}

/** Creates or updates a campaign and its code. Returns the campaign id. */
export async function saveCampaign(
	raw: CampaignInput,
	actor: Actor,
	id: string | null = null
): Promise<string> {
	const parsed = campaignInput.safeParse(raw);
	if (!parsed.success) throw new DomainError(parsed.error.issues[0].message, 'validation', 400);
	const v = parsed.data;
	const key = v.templateKey as TemplateKey;
	const params = TEMPLATES[key].params.parse(v.params);
	const benefitType = benefitTypeOf(key, params);
	return db().begin(async (tx) => {
		if (v.code) {
			const [taken] = await tx<{ campaign_id: string }[]>`
				select campaign_id from coupons where code = ${v.code}`;
			if (taken && taken.campaign_id !== id)
				throw new DomainError('Já existe um cupom com esse código.', 'code_taken', 409);
		}
		const status = v.activate ? 'active' : undefined;
		let campaignId = id;
		if (id) {
			const [row] = await tx<{ id: string }[]>`
				update campaigns set name = ${v.name}, template_key = ${key}, params = ${tx.json(params as never)},
					auto_apply = ${v.autoApply}, starts_at = ${v.startsAt}, ends_at = ${v.endsAt},
					time_windows = ${tx.json(v.timeWindows as never)}, benefit_type = ${benefitType},
					min_order_cents = ${v.minOrderCents}, max_uses_total = ${v.maxUsesTotal},
					max_uses_per_customer = ${v.maxUsesPerCustomer}, first_order_only = ${v.firstOrderOnly},
					status = coalesce(${status ?? null}, status)
				where id = ${id} returning id`;
			if (!row) throw new DomainError('Campanha não encontrada.', 'not_found', 404);
		} else {
			const [row] = await tx<{ id: string }[]>`
				insert into campaigns (name, template_key, params, auto_apply, starts_at, ends_at, time_windows,
					benefit_type, min_order_cents, max_uses_total, max_uses_per_customer, first_order_only,
					status, created_by)
				values (${v.name}, ${key}, ${tx.json(params as never)}, ${v.autoApply}, ${v.startsAt}, ${v.endsAt},
					${tx.json(v.timeWindows as never)}, ${benefitType}, ${v.minOrderCents}, ${v.maxUsesTotal},
					${v.maxUsesPerCustomer}, ${v.firstOrderOnly}, ${status ?? 'draft'},
					${actor.type === 'staff' ? actor.id : null})
				returning id`;
			campaignId = row.id;
		}
		// One public code per campaign from the admin; old codes are switched off, not deleted,
		// because past orders point at them.
		const [current] = await tx<{ id: string; code: string }[]>`
			select id, code from coupons where campaign_id = ${campaignId} and kind = 'manual' and active
			order by created_at limit 1`;
		if (current && current.code !== v.code)
			await tx`update coupons set active = false where campaign_id = ${campaignId} and kind = 'manual'`;
		if (v.code && current?.code !== v.code) {
			const [old] = await tx<{ id: string }[]>`select id from coupons where code = ${v.code}`;
			if (old) await tx`update coupons set active = true where id = ${old.id}`;
			else
				await tx`insert into coupons (campaign_id, code, kind) values (${campaignId}, ${v.code}, 'manual')`;
		}
		await audit(tx, actor, id ? 'campaign.updated' : 'campaign.created', 'campaign', campaignId, {
			name: v.name,
			template: key,
			code: v.code || null
		});
		return campaignId!;
	});
}

export async function setCampaignStatus(id: string, status: CampaignStatus, actor: Actor) {
	await db().begin(async (tx) => {
		const [row] = await tx<{ id: string }[]>`
			update campaigns set status = ${status} where id = ${id} returning id`;
		if (!row) throw new DomainError('Campanha não encontrada.', 'not_found', 404);
		await audit(tx, actor, 'campaign.status', 'campaign', id, { status });
	});
}

export interface CampaignResult {
	id: string;
	name: string;
	templateKey: string;
	status: CampaignStatus;
	code: string | null;
	autoApply: boolean;
	startsAt: Date | null;
	endsAt: Date | null;
	uses: number;
	discountCents: number;
	revenueCents: number;
	newCustomers: number;
}

/** One row per campaign for orders placed in [from, to). Revenue = paid for food, after the discount. */
export async function campaignResults(
	from: Date,
	to: Date,
	sql: Db = db()
): Promise<CampaignResult[]> {
	const rows = await sql<
		{
			id: string;
			name: string;
			template_key: string;
			status: CampaignStatus;
			code: string | null;
			auto_apply: boolean;
			starts_at: Date | null;
			ends_at: Date | null;
			uses: number;
			discount: string;
			revenue: string;
			new_customers: number;
		}[]
	>`
		with used as (
			select o.* from orders o
			where o.campaign_id is not null and o.created_at >= ${from} and o.created_at < ${to}
				and order_counts_for_offer(o.status, o.payment_status)
		)
		select c.id, c.name, c.template_key, c.status, c.auto_apply, c.starts_at, c.ends_at,
			(select code from coupons where campaign_id = c.id and kind = 'manual' and active
				order by created_at limit 1) as code,
			count(u.id)::int as uses,
			coalesce(sum(u.discount_cents), 0)::bigint as discount,
			coalesce(sum(u.subtotal_cents - u.discount_cents), 0)::bigint as revenue,
			count(distinct u.customer_id) filter (where u.customer_id is not null and not exists (
				select 1 from orders e where e.customer_id = u.customer_id and e.created_at < u.created_at
					and order_counts_for_offer(e.status, e.payment_status)))::int as new_customers
		from campaigns c left join used u on u.campaign_id = c.id
		group by c.id
		order by (c.status = 'active') desc, c.created_at desc`;
	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		templateKey: r.template_key,
		status: r.status,
		code: r.code,
		autoApply: r.auto_apply,
		startsAt: r.starts_at,
		endsAt: r.ends_at,
		uses: r.uses,
		discountCents: Number(r.discount),
		revenueCents: Number(r.revenue),
		newCustomers: r.new_customers
	}));
}
