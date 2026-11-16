// Loyalty stamps, referrals and birthday coupons: one campaign of each kind per shop, set up in
// Campanhas → Fidelidade. Coupons are issued to one customer, once per milestone (cycle_key is
// unique per customer), so retried jobs never issue twice.
import { randomBytes } from 'node:crypto';
import {
	benefitTypeOf,
	birthdayParams,
	describeBenefit,
	liveProblem,
	loyaltyParams,
	referralParams,
	stampProgress,
	TEMPLATES,
	type CouponBenefit,
	type MilestoneTemplate
} from '#lib/domain/campaigns.ts';
import { mayMarket, type CustomerSource } from '#lib/domain/consent.ts';
import { formatBRL } from '#lib/domain/money.ts';
import { fill } from '#lib/texts/catalog.ts';
import { audit, type Actor } from '../audit';
import { db, type Db, type Tx } from '../db';
import { DomainError } from '../errors';
import { queueMessage } from '../messaging/outbox';
import { getTexts } from '../settings/texts';

const NAMES: Record<MilestoneTemplate, string> = {
	loyalty_stamps: 'Cartão fidelidade',
	referral: 'Indique um amigo',
	birthday: 'Aniversário'
};
const CODE_PREFIX: Record<string, string> = {
	loyalty: 'FIEL',
	referral_welcome: 'AMIGO',
	referral_reward: 'INDICOU',
	birthday: 'NIVER'
};

interface MilestoneCampaign {
	id: string;
	status: string;
	starts_at: Date | null;
	ends_at: Date | null;
	params: unknown;
	created_at: Date;
}

/** Orders that earn stamps and referral rewards: paid, kept, real, on the shop's own channels. */
const COUNTED = `payment_status = 'paid' and status not in ('cancelled', 'rejected') and is_test = false
	and channel in ('web', 'counter')`;

async function campaignFor(sql: Db, template: MilestoneTemplate) {
	const [c] = await sql<MilestoneCampaign[]>`
		select id, status, starts_at, ends_at, params, created_at from campaigns
		where template_key = ${template} order by created_at desc limit 1`;
	return c ?? null;
}

function live(c: MilestoneCampaign | null, template: MilestoneTemplate, now = new Date()) {
	if (!c) return null;
	const problem = liveProblem(
		{
			id: c.id,
			templateKey: template,
			status: c.status as never,
			startsAt: c.starts_at,
			endsAt: c.ends_at,
			timeWindows: [],
			params: c.params,
			minOrderCents: 0
		},
		now
	);
	return problem ? null : c;
}

export interface MilestoneSettings {
	template: MilestoneTemplate;
	active: boolean;
	params: unknown;
}

export async function milestoneSettings(): Promise<MilestoneSettings[]> {
	const sql = db();
	const out: MilestoneSettings[] = [];
	for (const template of ['loyalty_stamps', 'referral', 'birthday'] as const) {
		const c = await campaignFor(sql, template);
		out.push({ template, active: c?.status === 'active', params: c?.params ?? null });
	}
	return out;
}

/** Turns a loyalty, referral or birthday programme on or off, with its benefit. */
export async function saveMilestone(
	template: MilestoneTemplate,
	input: { active: boolean; params: unknown },
	actor: Actor
) {
	const parsed = TEMPLATES[template].params.safeParse(input.params);
	if (!parsed.success) throw new DomainError('err.campaign.rules');
	const params = parsed.data;
	await db().begin(async (tx) => {
		const existing = await campaignFor(tx, template);
		const status = input.active ? 'active' : 'paused';
		const benefitType = benefitTypeOf(template, params);
		if (existing) {
			await tx`update campaigns set params = ${tx.json(params as never)}, status = ${status},
				benefit_type = ${benefitType}, auto_apply = false where id = ${existing.id}`;
		} else {
			await tx`insert into campaigns (name, template_key, params, status, auto_apply, benefit_type)
				values (${NAMES[template]}, ${template}, ${tx.json(params as never)}, ${status}, false, ${benefitType})`;
		}
		await audit(tx, actor, 'campaign.milestone_saved', 'campaign', existing?.id ?? null, {
			template,
			active: input.active
		});
	});
}

function newCode(kind: string) {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	const bytes = randomBytes(6);
	let tail = '';
	for (const b of bytes) tail += alphabet[b % alphabet.length];
	return `${CODE_PREFIX[kind] ?? 'CUPOM'}${tail}`;
}

interface Issued {
	id: string;
	code: string;
	customerId: string;
	kind: string;
	benefit: CouponBenefit;
	expiresAt: Date | null;
}

async function issue(
	tx: Tx,
	c: { campaignId: string; customerId: string; kind: string; cycleKey: string },
	extra: { expiresAt: Date | null; milestoneAt?: number | null; benefit: CouponBenefit }
): Promise<Issued | null> {
	for (let attempt = 0; attempt < 3; attempt++) {
		const code = newCode(c.kind);
		const rows = await tx<{ id: string }[]>`
			insert into coupons (campaign_id, customer_id, code, kind, expires_at, max_uses, milestone_at, cycle_key)
			select ${c.campaignId}, ${c.customerId}, ${code}, ${c.kind}, ${extra.expiresAt}, 1,
				${extra.milestoneAt ?? null}, ${c.cycleKey}
			where not exists (select 1 from coupons where customer_id = ${c.customerId}
				and cycle_key = ${c.cycleKey})
			  and not exists (select 1 from coupons where code = ${code})
			on conflict do nothing returning id`;
		if (rows.length)
			return {
				id: rows[0].id,
				code,
				customerId: c.customerId,
				kind: c.kind,
				benefit: extra.benefit,
				expiresAt: extra.expiresAt
			};
		const [taken] = await tx`select 1 from coupons where customer_id = ${c.customerId}
			and cycle_key = ${c.cycleKey}`;
		if (taken) return null;
	}
	return null;
}

const days = (n: number) => new Date(Date.now() + n * 86400_000);

/** Worker, when an order is paid: stamps, and the referrer's reward on a friend's first order. */
export async function processMilestones(orderId: string): Promise<Issued[]> {
	const issued = await db().begin(async (tx) => {
		const [o] = await tx<{ customer_id: string | null; coupon_id: string | null; ok: boolean }[]>`
			select customer_id, coupon_id, (${tx.unsafe(COUNTED)}) as ok from orders where id = ${orderId}`;
		if (!o?.customer_id || !o.ok) return [];
		const customerId = o.customer_id;
		await tx`select id from customers where id = ${customerId} for update`;
		const out: Issued[] = [];

		const loyalty = live(await campaignFor(tx, 'loyalty_stamps'), 'loyalty_stamps');
		if (loyalty) {
			const p = loyaltyParams.parse(loyalty.params);
			const [{ n }] = await tx<{ n: number }[]>`
				select count(*)::int as n from orders where customer_id = ${customerId}
				and created_at >= ${loyalty.created_at} and ${tx.unsafe(COUNTED)}`;
			// Every milestone reached so far, so a skipped job still pays out (once).
			for (let m = 1; m <= stampProgress(n, p.every).earned; m++) {
				const coupon = await issue(
					tx,
					{
						campaignId: loyalty.id,
						customerId,
						kind: 'loyalty',
						cycleKey: `loyalty:${loyalty.id}:${m * p.every}`
					},
					{ expiresAt: days(p.couponDays), milestoneAt: m * p.every, benefit: p.benefit }
				);
				if (coupon) out.push(coupon);
			}
		}

		if (o.coupon_id) {
			const [welcome] = await tx<
				{ kind: string; friend_ref: string | null; campaign_id: string }[]
			>`
				select kind, friend_ref, campaign_id from coupons where id = ${o.coupon_id}`;
			const referral = live(await campaignFor(tx, 'referral'), 'referral');
			if (
				welcome?.kind === 'referral_welcome' &&
				welcome.friend_ref &&
				welcome.friend_ref !== customerId &&
				referral
			) {
				const p = referralParams.parse(referral.params);
				const coupon = await issue(
					tx,
					{
						campaignId: referral.id,
						customerId: welcome.friend_ref,
						kind: 'referral_reward',
						cycleKey: `referral:${customerId}`
					},
					{ expiresAt: days(p.couponDays), benefit: p.reward }
				);
				if (coupon) out.push(coupon);
			}
		}
		for (const c of out) await notifyCoupon(tx, c);
		return out;
	});
	return issued;
}

/** Daily: a coupon for customers whose birthday is in the next 7 days, valid that week. */
export async function issueBirthdayCoupons(now = new Date()): Promise<number> {
	return db().begin(async (tx) => {
		const c = live(await campaignFor(tx, 'birthday'), 'birthday', now);
		if (!c) return 0;
		const p = birthdayParams.parse(c.params);
		const rows = await tx<{ id: string; birthday: string }[]>`
			select id, to_char(birthday, 'YYYY-MM-DD') as birthday from customers
			where birthday is not null and deleted_at is null`;
		const people = rows
			.map((r) => ({ id: r.id, next_birthday: nextBirthday(r.birthday, now) }))
			.filter((r) => r.next_birthday.getTime() - startOfDay(now).getTime() < 7 * 86400_000);
		let n = 0;
		for (const person of people) {
			const year = person.next_birthday.getUTCFullYear();
			const coupon = await issue(
				tx,
				{ campaignId: c.id, customerId: person.id, kind: 'birthday', cycleKey: `birthday:${year}` },
				{
					expiresAt: new Date(person.next_birthday.getTime() + 8 * 86400_000),
					benefit: p.benefit
				}
			);
			if (coupon) {
				n++;
				await notifyCoupon(tx, coupon);
			}
		}
		return n;
	});
}

function startOfDay(d: Date) {
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** The next birthday on or after today (29 February counts as the 28th in other years). */
export function nextBirthday(birthday: string, now: Date): Date {
	const [, m, d] = birthday.split('-').map(Number);
	const today = startOfDay(now);
	const on = (y: number) => {
		const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
		return new Date(Date.UTC(y, m - 1, m === 2 && d === 29 && !leap ? 28 : d));
	};
	const thisYear = on(today.getUTCFullYear());
	return thisYear >= today ? thisYear : on(today.getUTCFullYear() + 1);
}

/** The coupon is always on /conta; an e-mail goes out only to contacts who accept offers. */
async function notifyCoupon(tx: Tx, c: Issued) {
	const [p] = await tx<
		{
			name: string | null;
			email: string | null;
			source: CustomerSource;
			marketing_consent_at: Date | null;
			marketing_opt_out_at: Date | null;
			deleted_at: Date | null;
		}[]
	>`select name, email, source, marketing_consent_at, marketing_opt_out_at, deleted_at
		from customers where id = ${c.customerId}`;
	if (!p?.email) return;
	const allowed = mayMarket({
		source: p.source,
		marketingConsentAt: p.marketing_consent_at,
		marketingOptOutAt: p.marketing_opt_out_at,
		deletedAt: p.deleted_at
	});
	if (!allowed) return;
	const texts = await getTexts(tx);
	const vars = {
		name: (p.name ?? '').split(' ')[0] || 'cliente',
		code: c.code,
		benefit: describeBenefit(c.benefit, formatBRL),
		until: c.expiresAt
			? c.expiresAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
			: ''
	};
	await queueMessage(tx, {
		channel: 'email',
		to: p.email,
		template: '_text',
		vars: {
			subject: fill(texts['loyalty.mail.subject'], vars),
			body: fill(texts['loyalty.mail.body'], vars)
		}
	});
}

/** The customer's shareable referral coupon (created the first time it is shown). */
export async function referralCode(customerId: string): Promise<string | null> {
	return db().begin(async (tx) => {
		const c = live(await campaignFor(tx, 'referral'), 'referral');
		if (!c) return null;
		const [existing] = await tx<{ code: string }[]>`
			select code from coupons where kind = 'referral_welcome' and friend_ref = ${customerId}`;
		if (existing) return existing.code;
		for (let attempt = 0; attempt < 3; attempt++) {
			const code = newCode('referral_welcome');
			const [row] = await tx<{ code: string }[]>`
				insert into coupons (campaign_id, code, kind, friend_ref)
				values (${c.id}, ${code}, 'referral_welcome', ${customerId})
				on conflict do nothing returning code`;
			if (row) return row.code;
		}
		return null;
	});
}

/** What /conta shows: the stamp card, the referral code and the customer's open coupons. */
export async function customerRewards(customerId: string) {
	const sql = db();
	const loyalty = live(await campaignFor(sql, 'loyalty_stamps'), 'loyalty_stamps');
	let stamps: { stamps: number; every: number; benefit: string } | null = null;
	if (loyalty) {
		const p = loyaltyParams.parse(loyalty.params);
		const [{ n }] = await sql<{ n: number }[]>`
			select count(*)::int as n from orders where customer_id = ${customerId}
			and created_at >= ${loyalty.created_at} and ${sql.unsafe(COUNTED)}`;
		const s = stampProgress(n, p.every);
		stamps = { stamps: s.stamps, every: s.every, benefit: describeBenefit(p.benefit, formatBRL) };
	}
	const coupons = await sql<{ code: string; kind: string; expires_at: Date | null }[]>`
		select c.code, c.kind, c.expires_at from coupons c
		where c.customer_id = ${customerId} and c.active and (c.expires_at is null or c.expires_at > now())
			and not exists (select 1 from orders o where o.coupon_id = c.id
				and order_counts_for_offer(o.status, o.payment_status))
		order by c.created_at desc`;
	return {
		stamps,
		referralCode: await referralCode(customerId),
		coupons: coupons.map((c) => ({ code: c.code, kind: c.kind, expiresAt: c.expires_at }))
	};
}

export async function setBirthday(customerId: string, birthday: string | null) {
	if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) throw new DomainError('err.birthday');
	await db()`update customers set birthday = ${birthday} where id = ${customerId}`;
}
