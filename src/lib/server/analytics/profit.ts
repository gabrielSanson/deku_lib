// Relatórios → Lucro: what each order and each channel leaves after the app's commission,
// payment fees, delivery cost and food cost. Food cost comes from stock (or the ficha técnica);
// orders with a product that has no ficha are counted apart, never as zero cost.
import { feeCents, findTerm, type PaymentTerm } from '#lib/domain/payment-fees.ts';
import { orderProfit } from '#lib/domain/profit.ts';
import type { PendingQuery, Row } from 'postgres';
import { audit, type Actor } from '../audit';
import { db, type Db } from '../db';
import { DomainError } from '../errors';
import { paymentTerms } from '../payments/fees';
import { paymentSettings } from '../payments/provider';
import { foodCosts } from '../stock/service';
import { SHOP_TZ, type Range } from './queries';

export interface ProfitSettings {
	ifoodCommissionBps: number;
	ifoodDeliveryCommissionBps: number;
	odCommissionBps: number;
	deliveryCostCents: number;
	simplesRateBps: number;
}

export async function profitSettings(sql: Db = db()): Promise<ProfitSettings> {
	const [c] = await sql<
		{ ifood: number; ifood_delivery: number; od: number }[]
	>`select ifood_commission_bps as ifood, ifood_delivery_commission_bps as ifood_delivery,
			od_commission_bps as od
		from channel_settings where shop_id = current_shop_id()`;
	const [s] = await sql<{ delivery_cost_cents: number; simples_rate_bps: number }[]>`
		select delivery_cost_cents, simples_rate_bps from store_runtime_settings
		where shop_id = current_shop_id()`;
	return {
		ifoodCommissionBps: c?.ifood ?? 1200,
		ifoodDeliveryCommissionBps: c?.ifood_delivery ?? 2300,
		odCommissionBps: c?.od ?? 0,
		deliveryCostCents: s?.delivery_cost_cents ?? 0,
		simplesRateBps: s?.simples_rate_bps ?? 0
	};
}

export async function saveProfitSettings(input: ProfitSettings, actor: Actor) {
	const bps = (n: number, max: number) => Number.isInteger(n) && n >= 0 && n <= max;
	if (
		!bps(input.ifoodCommissionBps, 5000) ||
		!bps(input.ifoodDeliveryCommissionBps, 5000) ||
		!bps(input.odCommissionBps, 5000) ||
		!bps(input.simplesRateBps, 3000) ||
		!bps(input.deliveryCostCents, 100_000)
	)
		throw new DomainError('err.profit.settings');
	await db().begin(async (tx) => {
		await tx`insert into channel_settings (ifood_commission_bps, ifood_delivery_commission_bps, od_commission_bps)
			values (${input.ifoodCommissionBps}, ${input.ifoodDeliveryCommissionBps}, ${input.odCommissionBps})
			on conflict (shop_id) do update set ifood_commission_bps = excluded.ifood_commission_bps,
				ifood_delivery_commission_bps = excluded.ifood_delivery_commission_bps,
				od_commission_bps = excluded.od_commission_bps, updated_at = now()`;
		await tx`update store_runtime_settings set delivery_cost_cents = ${input.deliveryCostCents},
			simples_rate_bps = ${input.simplesRateBps} where shop_id = current_shop_id()`;
		await audit(tx, actor, 'profit.settings_saved', 'profit_settings', '1', { ...input });
	});
}

interface OrderRow {
	id: string;
	channel: string;
	fulfillment_type: string;
	fulfillment_provider: string;
	payment_plan: string;
	total_cents: number;
	subtotal_cents: number;
	discount_cents: number;
	delivery_fee_cents: number;
	tender_fees: number;
	payout_commission: number | null;
	payout_fee: number | null;
	/** Delivered by an own courier in a settled run: the payout is already an expense. */
	courier_paid: boolean;
}

const APPS = ['ifood', 'opendelivery'];

function commissionBps(o: OrderRow, s: ProfitSettings) {
	if (o.channel === 'ifood')
		return o.fulfillment_provider === 'ifood_courier'
			? s.ifoodDeliveryCommissionBps
			: s.ifoodCommissionBps;
	if (o.channel === 'opendelivery') return s.odCommissionBps;
	return 0;
}

function paymentFees(o: OrderRow, terms: PaymentTerm[]) {
	if (o.payout_fee != null) return o.payout_fee;
	// Paid inside the iFood app: iFood's online payment fee.
	if (o.channel === 'ifood' && o.payment_plan === 'channel')
		return feeCents(findTerm(terms, 'ifood_collected', 'ifood'), o.total_cents);
	return o.tender_fees;
}

function profitOf(o: OrderRow, s: ProfitSettings, terms: PaymentTerm[], food: number | null) {
	const fees = paymentFees(o, terms);
	const delivery =
		o.fulfillment_type === 'delivery' && o.fulfillment_provider === 'own_driver' && !o.courier_paid
			? s.deliveryCostCents
			: 0;
	return {
		fees,
		delivery,
		...orderProfit({
			totalCents: o.total_cents,
			discountCents: o.discount_cents,
			deliveryFeeCents: o.delivery_fee_cents,
			channelCommissionBps: commissionBps(o, s),
			channelCommissionCents: o.payout_commission,
			paymentFeesCents: fees,
			deliveryCostCents: delivery,
			foodCostCents: food
		})
	};
}

async function ordersIn(sql: Db, where: PendingQuery<Row[]>) {
	return sql<OrderRow[]>`
		select o.id, o.channel, o.fulfillment_type, o.fulfillment_provider, o.payment_plan,
			o.total_cents, o.subtotal_cents, o.discount_cents, o.delivery_fee_cents,
			coalesce((select sum(fee_cents) from tenders t where t.order_id = o.id
				and t.status in ('paid', 'refunded')), 0)::int as tender_fees,
			p.commission_cents as payout_commission, p.fee_cents as payout_fee,
			exists (select 1 from deliveries d join delivery_runs r on r.id = d.run_id
				where d.order_id = o.id and r.settled_at is not null and r.expense_id is not null) as courier_paid
		from orders o
		left join lateral (select sum(commission_cents)::int as commission_cents, sum(fee_cents)::int as fee_cents
			from channel_payouts cp where cp.order_id = o.id having count(*) > 0) p on true
		where ${where}`;
}

/** The own site's Pix fee, for "what these app orders would have left on your site". */
async function ownPixTerm(terms: PaymentTerm[]) {
	const provider = (await paymentSettings()).provider;
	if (provider === 'efi' || provider === 'mercadopago') return findTerm(terms, 'pix', provider);
	return findTerm(terms, 'external_pix', 'manual');
}

export interface ChannelProfit {
	channel: string;
	orders: number;
	grossCents: number;
	discountCents: number;
	commissionCents: number;
	feesCents: number;
	deliveryCostCents: number;
	foodCostCents: number;
	/** Orders left out of food cost: a product without a ficha técnica. */
	withoutRecipe: number;
	netCents: number;
}

export async function profitReport(range: Range) {
	const sql = db();
	const rows = await ordersIn(
		sql,
		sql`not o.is_test and o.status not in ('cancelled', 'rejected')
			and o.created_at >= (${range.from}::timestamp at time zone ${SHOP_TZ})
			and o.created_at < ((${range.to}::timestamp + interval '1 day') at time zone ${SHOP_TZ})`
	);
	const [settings, terms] = await Promise.all([profitSettings(sql), paymentTerms(sql)]);
	const food = await foodCosts(
		rows.map((r) => r.id),
		sql
	);
	const pix = await ownPixTerm(terms);
	const byChannel = new Map<string, ChannelProfit>();
	let appOrders = 0;
	let appExtra = 0;
	for (const o of rows) {
		const f = food.get(o.id) ?? null;
		const p = profitOf(o, settings, terms, f);
		const c = byChannel.get(o.channel) ?? {
			channel: o.channel,
			orders: 0,
			grossCents: 0,
			discountCents: 0,
			commissionCents: 0,
			feesCents: 0,
			deliveryCostCents: 0,
			foodCostCents: 0,
			withoutRecipe: 0,
			netCents: 0
		};
		c.orders++;
		c.grossCents += o.subtotal_cents + o.delivery_fee_cents;
		c.discountCents += o.discount_cents;
		c.commissionCents += p.commissionCents;
		c.feesCents += p.fees;
		c.deliveryCostCents += p.delivery;
		if (f == null) c.withoutRecipe++;
		else c.foodCostCents += f;
		c.netCents += p.netCents ?? p.beforeFoodCents;
		byChannel.set(o.channel, c);
		if (o.channel === 'ifood') {
			appOrders++;
			appExtra += p.commissionCents + p.fees - feeCents(pix, o.total_cents);
		}
	}
	const channels = [...byChannel.values()].sort((a, b) => b.grossCents - a.grossCents);
	const total = channels.reduce(
		(t, c) => ({
			...t,
			orders: t.orders + c.orders,
			grossCents: t.grossCents + c.grossCents,
			discountCents: t.discountCents + c.discountCents,
			commissionCents: t.commissionCents + c.commissionCents,
			feesCents: t.feesCents + c.feesCents,
			deliveryCostCents: t.deliveryCostCents + c.deliveryCostCents,
			foodCostCents: t.foodCostCents + c.foodCostCents,
			withoutRecipe: t.withoutRecipe + c.withoutRecipe,
			netCents: t.netCents + c.netCents
		}),
		{
			channel: 'total',
			orders: 0,
			grossCents: 0,
			discountCents: 0,
			commissionCents: 0,
			feesCents: 0,
			deliveryCostCents: 0,
			foodCostCents: 0,
			withoutRecipe: 0,
			netCents: 0
		} as ChannelProfit
	);
	return { channels, total, ifood: { orders: appOrders, extraCents: appExtra }, settings };
}

/** The breakdown shown to admins on the order page; null for test or app-less edge cases. */
export async function orderProfitDetail(orderId: string) {
	const sql = db();
	const [o] = await ordersIn(sql, sql`o.id = ${orderId}`);
	if (!o) return null;
	const [settings, terms] = await Promise.all([profitSettings(sql), paymentTerms(sql)]);
	const food = (await foodCosts([orderId], sql)).get(orderId) ?? null;
	const p = profitOf(o, settings, terms, food);
	return {
		totalCents: o.total_cents,
		commissionCents: p.commissionCents,
		feesCents: p.fees,
		deliveryCostCents: p.delivery,
		foodCostCents: food,
		beforeFoodCents: p.beforeFoodCents,
		netCents: p.netCents,
		fromStatement: o.payout_commission != null,
		app: APPS.includes(o.channel)
	};
}
