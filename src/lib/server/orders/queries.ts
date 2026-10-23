// Read models for the staff hub, kitchen display and customer status page.
import type { OrderStatus, PaymentStatus } from '#lib/domain/order-status.ts';
import type { PaymentPlan } from '#lib/domain/payment-rules.ts';
import { pickupCode } from '#lib/domain/pickup.ts';
import { db, type Db } from '../db';

export interface OrderModifierView {
	groupName: string;
	optionName: string;
	quantity: number;
	unitPriceCents: number;
}

export interface OrderItemView {
	id: string;
	productSku: string;
	productName: string;
	quantity: number;
	unitPriceCents: number;
	modifiersUnitCents: number;
	lineTotalCents: number;
	/** Given away by the order's promotion (a free item keeps its price here). */
	discountCents: number;
	note: string | null;
	allergyFlag: boolean;
	prepStation: string;
	modifiers: OrderModifierView[];
}

export interface OrderSummary {
	id: string;
	orderNumber: number;
	channel: 'counter' | 'web' | 'ifood';
	sourceMode: string;
	customerLabel: string | null;
	channelDisplayId: string | null;
	status: OrderStatus;
	paymentStatus: PaymentStatus;
	paymentPlan: PaymentPlan;
	fulfillmentType: 'counter' | 'pickup' | 'delivery' | 'dine_in';
	tableLabel: string | null;
	fulfillmentProvider: 'shop' | 'own_driver' | 'ifood_courier';
	totalCents: number;
	notes: string | null;
	createdAt: Date;
	promisedAt: Date | null;
	acceptedAt: Date | null;
	readyAt: Date | null;
	kitchenSeenAt: Date | null;
	/** Last time staff tapped "Chamar". */
	calledAt: Date | null;
	version: number;
	items: OrderItemView[];
}

interface OrderRow {
	id: string;
	order_number: number;
	channel: OrderSummary['channel'];
	source_mode: string;
	customer_label: string | null;
	channel_display_id: string | null;
	status: OrderStatus;
	payment_status: PaymentStatus;
	payment_plan: OrderSummary['paymentPlan'];
	fulfillment_type: OrderSummary['fulfillmentType'];
	table_label: string | null;
	fulfillment_provider: OrderSummary['fulfillmentProvider'];
	total_cents: number;
	notes: string | null;
	created_at: Date;
	promised_at: Date | null;
	accepted_at: Date | null;
	ready_at: Date | null;
	kitchen_seen_at: Date | null;
	called_at: Date | null;
	version: number;
}

async function withItems(sql: Db, rows: OrderRow[]): Promise<OrderSummary[]> {
	if (rows.length === 0) return [];
	const ids = rows.map((r) => r.id);
	const items = await sql<
		{
			id: string;
			order_id: string;
			product_sku: string;
			product_name: string;
			quantity: number;
			unit_price_cents: number;
			modifiers_unit_cents: number;
			line_total_cents: number;
			discount_cents: number;
			note: string | null;
			allergy_flag: boolean;
			prep_station: string;
		}[]
	>`select * from order_items where order_id = any(${ids}::uuid[]) order by position`;
	const itemIds = items.map((i) => i.id);
	const mods = itemIds.length
		? await sql<
				{
					order_item_id: string;
					group_name: string;
					option_name: string;
					quantity: number;
					unit_price_cents: number;
				}[]
			>`select order_item_id, group_name, option_name, quantity, unit_price_cents
				from order_item_modifiers where order_item_id = any(${itemIds}::uuid[])`
		: [];

	return rows.map((r) => ({
		id: r.id,
		orderNumber: r.order_number,
		channel: r.channel,
		sourceMode: r.source_mode,
		customerLabel: r.customer_label,
		channelDisplayId: r.channel_display_id,
		status: r.status,
		paymentStatus: r.payment_status,
		paymentPlan: r.payment_plan,
		fulfillmentType: r.fulfillment_type,
		tableLabel: r.table_label,
		fulfillmentProvider: r.fulfillment_provider,
		totalCents: r.total_cents,
		notes: r.notes,
		createdAt: r.created_at,
		promisedAt: r.promised_at,
		acceptedAt: r.accepted_at,
		readyAt: r.ready_at,
		kitchenSeenAt: r.kitchen_seen_at,
		calledAt: r.called_at,
		version: r.version,
		items: items
			.filter((i) => i.order_id === r.id)
			.map((i) => ({
				id: i.id,
				productSku: i.product_sku,
				productName: i.product_name,
				quantity: i.quantity,
				unitPriceCents: i.unit_price_cents,
				modifiersUnitCents: i.modifiers_unit_cents,
				lineTotalCents: i.line_total_cents,
				discountCents: i.discount_cents,
				note: i.note,
				allergyFlag: i.allergy_flag,
				prepStation: i.prep_station,
				modifiers: mods
					.filter((m) => m.order_item_id === i.id)
					.map((m) => ({
						groupName: m.group_name,
						optionName: m.option_name,
						quantity: m.quantity,
						unitPriceCents: m.unit_price_cents
					}))
			}))
	}));
}

export interface OrderFilter {
	statuses?: OrderStatus[];
	channel?: string;
	since?: Date;
	limit?: number;
}

export async function listOrders(
	filter: OrderFilter = {},
	sql: Db = db()
): Promise<OrderSummary[]> {
	const statuses = filter.statuses ?? null;
	const rows = await sql<OrderRow[]>`
		select id, order_number, channel, source_mode, customer_label, channel_display_id, status, payment_status, payment_plan, fulfillment_type, table_label,
			fulfillment_provider, total_cents, notes, created_at, promised_at, accepted_at, ready_at,
			kitchen_seen_at, called_at, version
		from orders
		where (${statuses}::text[] is null or status = any(${statuses}::text[]))
			and (${filter.channel ?? null}::text is null or channel = ${filter.channel ?? null})
			and (${filter.since ?? null}::timestamptz is null or created_at >= ${filter.since ?? null})
		order by created_at desc
		limit ${Math.min(filter.limit ?? 100, 500)}`;
	return withItems(sql, rows);
}

/** Orders the kitchen should see, oldest first. Web orders wait until paid or confirmed. */
export async function listKitchenOrders(sql: Db = db()): Promise<OrderSummary[]> {
	const rows = await sql<OrderRow[]>`
		select id, order_number, channel, source_mode, customer_label, channel_display_id, status, payment_status, payment_plan, fulfillment_type, table_label,
			fulfillment_provider, total_cents, notes, created_at, promised_at, accepted_at, ready_at,
			kitchen_seen_at, called_at, version
		from orders
		where status in ('confirmed', 'preparing', 'ready')
			or (status = 'completed' and completed_at > now() - interval '10 minutes')
		order by coalesce(accepted_at, created_at)
		limit 200`;
	return withItems(sql, rows);
}

export interface BoardOrder {
	/** The full order number, shown small under the code. */
	number: number;
	code: string;
	status: 'preparing' | 'ready';
	/** Changes when the order turns ready or staff tap "Chamar", so the room screen can chime. */
	alertKey: string | null;
}

/**
 * What the customer screen in the room shows: pickup codes only, no names or
 * items. Delivery orders are left out, nobody waits for them in the room.
 */
export async function listBoardOrders(sql: Db = db()): Promise<BoardOrder[]> {
	const rows = await sql<
		{ order_number: number; status: string; ready_at: Date | null; called_at: Date | null }[]
	>`
		select order_number, status, ready_at, called_at from orders
		where fulfillment_type <> 'delivery' and not is_test
			and (status in ('confirmed', 'preparing')
				or (status = 'ready' and ready_at > now() - interval '30 minutes'))
		order by coalesce(ready_at, accepted_at, created_at)
		limit 60`;
	return rows.map((r) => ({
		number: r.order_number,
		code: pickupCode(r.order_number),
		status: r.status === 'ready' ? 'ready' : 'preparing',
		alertKey: r.status === 'ready' ? `${r.order_number}:${+(r.called_at ?? r.ready_at ?? 0)}` : null
	}));
}

export interface OrderDetail extends OrderSummary {
	subtotalCents: number;
	discountCents: number;
	/** The campaign that paid for the discount, if any. */
	offerName: string | null;
	deliveryFeeCents: number;
	cancelReason: string | null;
	/** The phone's ready alert could not be delivered at least once. */
	pushFailed: boolean;
	publicToken: string;
	catalogVersion: string | null;
	address: {
		recipient: string;
		cep: string;
		street: string;
		number: string;
		complement: string | null;
		neighborhood: string;
		city: string;
		state: string;
		instructions: string | null;
	} | null;
	history: {
		fromStatus: OrderStatus | null;
		toStatus: OrderStatus;
		actorType: string;
		actorName: string | null;
		reason: string | null;
		occurredAt: Date;
	}[];
	tenders: {
		id: string;
		method: string;
		provider: string;
		providerReference: string | null;
		amountCents: number;
		changeCents: number | null;
		status: PaymentStatus;
		createdAt: Date;
		recordedByName: string | null;
	}[];
}

export async function getOrderDetail(id: string, sql: Db = db()): Promise<OrderDetail | null> {
	const [row] = await sql<
		(OrderRow & {
			subtotal_cents: number;
			discount_cents: number;
			delivery_fee_cents: number;
			cancel_reason: string | null;
			public_token: string;
			catalog_version: string | null;
			offer_name: string | null;
		})[]
	>`select o.*, c.name as offer_name from orders o left join campaigns c on c.id = o.campaign_id
		where o.id = ${id}`;
	if (!row) return null;
	const [summary] = await withItems(sql, [row]);
	const [address] = await sql<NonNullable<OrderDetail['address']>[]>`
		select recipient, cep, street, number, complement, neighborhood, city, state, instructions
		from order_addresses where order_id = ${id}`;
	const history = await sql<
		{
			from_status: OrderStatus | null;
			to_status: OrderStatus;
			actor_type: string;
			actor_name: string | null;
			reason: string | null;
			occurred_at: Date;
		}[]
	>`select h.from_status, h.to_status, h.actor_type, s.display_name as actor_name, h.reason, h.occurred_at
		from order_status_history h left join staff_users s on s.id = h.actor_id
		where h.order_id = ${id} order by h.occurred_at, h.id`;
	const tenders = await sql<
		{
			id: string;
			method: string;
			provider: string;
			provider_reference: string | null;
			amount_cents: number;
			change_cents: number | null;
			status: PaymentStatus;
			created_at: Date;
			recorded_by_name: string | null;
		}[]
	>`select t.id, t.method, t.provider, t.provider_reference, t.amount_cents, t.change_cents, t.status, t.created_at,
			s.display_name as recorded_by_name
		from tenders t left join staff_users s on s.id = t.recorded_by
		where t.order_id = ${id} order by t.created_at`;
	const [push] = await sql<{ failed: boolean }[]>`
		select exists (
			select 1 from audit_log where object_type = 'order' and object_id = ${id}
				and action = 'order.push_failed'
		) as failed`;
	return {
		...summary,
		pushFailed: push.failed,
		subtotalCents: row.subtotal_cents,
		discountCents: row.discount_cents,
		offerName: row.offer_name,
		deliveryFeeCents: row.delivery_fee_cents,
		cancelReason: row.cancel_reason,
		publicToken: row.public_token,
		catalogVersion: row.catalog_version,
		address: address ?? null,
		history: history.map((h) => ({
			fromStatus: h.from_status,
			toStatus: h.to_status,
			actorType: h.actor_type,
			actorName: h.actor_name,
			reason: h.reason,
			occurredAt: h.occurred_at
		})),
		tenders: tenders.map((t) => ({
			id: t.id,
			method: t.method,
			provider: t.provider,
			providerReference: t.provider_reference,
			amountCents: t.amount_cents,
			changeCents: t.change_cents,
			status: t.status,
			createdAt: t.created_at,
			recordedByName: t.recorded_by_name
		}))
	};
}

/** Customer-safe status view. Omits staff notes, history actors and address. */
export async function getPublicOrder(token: string, sql: Db = db()) {
	if (!/^[0-9a-f]{36}$/.test(token)) return null;
	const [row] = await sql<{ id: string }[]>`select id from orders where public_token = ${token}`;
	if (!row) return null;
	const d = await getOrderDetail(row.id, sql);
	if (!d) return null;
	return {
		orderNumber: d.orderNumber,
		status: d.status,
		paymentStatus: d.paymentStatus,
		paymentPlan: d.paymentPlan,
		fulfillmentType: d.fulfillmentType,
		createdAt: d.createdAt,
		acceptedAt: d.acceptedAt,
		promisedAt: d.promisedAt,
		readyAt: d.readyAt,
		calledAt: d.calledAt,
		tableLabel: d.tableLabel,
		subtotalCents: d.subtotalCents,
		discountCents: d.discountCents,
		offerName: d.offerName,
		deliveryFeeCents: d.deliveryFeeCents,
		totalCents: d.totalCents,
		items: d.items.map((i) => ({
			productName: i.productName,
			quantity: i.quantity,
			lineTotalCents: i.lineTotalCents,
			discountCents: i.discountCents,
			modifiers: i.modifiers.map((m) => m.optionName)
		}))
	};
}

/** Order counts by status for the orders board tabs. Open orders always count; the rest only for three days. */
export async function orderStatusCounts(
	channel?: string,
	sql: Db = db()
): Promise<Record<string, number>> {
	const rows = await sql<{ status: string; n: number }[]>`
		select status, count(*)::int as n from orders
		where (status in ('new', 'confirmed', 'preparing', 'ready') or created_at >= now() - interval '3 days')
			and (${channel ?? null}::text is null or channel = ${channel ?? null})
		group by status`;
	return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}
