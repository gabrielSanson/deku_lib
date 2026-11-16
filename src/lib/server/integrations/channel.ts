// Delivery apps (iFood, Open Delivery partners) behind one interface. An adapter knows one app's
// API; the functions here do the rest the same way for every app: store each inbound event before
// anything else, turn events into orders and status changes, and mirror our changes back once.
// Everything runs inside the shop's scope (withShop), so the adapter reads that shop's keys.
import { canTransition, type OrderStatus, type PaymentStatus } from '#lib/domain/order-status.ts';
import type { PricedCart } from '#lib/domain/pricing.ts';
import { audit, type Actor } from '../audit';
import { getCatalog } from '../catalog/service';
import { db } from '../db';
import { enqueue, type QueueName } from '../jobs';
import {
	createOrder,
	transitionOrder,
	type FulfillmentProvider,
	type SourceMode
} from '../orders/service';

export type ChannelId = 'ifood' | 'opendelivery_99food' | 'opendelivery_keeta';

/** One event as the app sent it, with the fields every app has. */
export interface ChannelEvent {
	id: string;
	type: string;
	orderId: string | null;
	raw: unknown;
}

/** What an event means for us. */
export type EventMeaning =
	| { kind: 'placed' }
	| { kind: 'status'; to: OrderStatus }
	/** The app refused a cancellation we asked for: the order goes on. */
	| { kind: 'cancelDenied' }
	| { kind: 'ignore' };

export interface ProductInfo {
	sku: string;
	categoryName: string | null;
	prepStation: string;
}

/** An app's order translated to ours; the app priced it, so our menu does not re-price it. */
export interface ExternalOrder {
	channelOrderId: string;
	displayId: string | null;
	cart: PricedCart;
	deliveryFeeCents: number;
	discountCents: number;
	channelTotalCents: number;
	fulfillmentType: 'pickup' | 'delivery';
	fulfillmentProvider: FulfillmentProvider;
	customer: { name: string } | undefined;
	customerLabel: string;
	address:
		| {
				recipient: string;
				cep: string;
				street: string;
				number: string;
				complement: string | null;
				neighborhood: string;
				city: string;
				state: string;
				instructions: string | null;
		  }
		| undefined;
	paymentStatus: PaymentStatus;
	notes: string | null;
	isTest: boolean;
	unmappedCodes: string[];
	/** The app's own payload, kept only while the shop is in homologation. */
	raw?: unknown;
}

export interface OrderRef {
	id: string;
	channelOrderId: string;
	fulfillmentType: string;
	fulfillmentProvider: string;
	isTest: boolean;
}

/** The call that tells the app about one of our status changes. */
export interface OutboundCall {
	action: string;
	body?: unknown;
}

export interface MenuItemForChannel {
	sku: string;
	name: string;
	description: string;
	categoryId: string;
	categoryName: string;
	priceCents: number;
	imageUrl: string | null;
	available: boolean;
	options: { groupId: string; groupName: string; sku: string; name: string; priceCents: number }[];
}

export interface ChannelMenu {
	categories: { id: string; name: string; position: number }[];
	items: MenuItemForChannel[];
}

export interface SyncReport {
	created: number;
	updated: number;
	failed: { sku: string; reason: string }[];
}

export interface ChannelAdapter {
	channel: ChannelId;
	/** orders.channel and orders.channel_partner for this app's orders. */
	orderChannel: 'ifood' | 'opendelivery';
	partner: string | null;
	sourceMode: SourceMode;
	/** Label for order names and messages ("iFood", "99Food"). */
	label: string;
	queues: { event: QueueName; sync: QueueName };
	enabled(): Promise<boolean>;
	pollEvents?(): Promise<ChannelEvent[]>;
	ackEvents(ids: string[]): Promise<void>;
	meaning(eventType: string): EventMeaning;
	getOrder(
		channelOrderId: string,
		lookup: (code: string) => ProductInfo | null
	): Promise<ExternalOrder>;
	/** null when the app needs no call for this change. */
	planStatus(order: OrderRef, to: OrderStatus, reason: string | null): OutboundCall | null;
	/** Returns the app's answer (stored while in homologation). */
	sendStatus(order: OrderRef, call: OutboundCall): Promise<unknown>;
	/** Homologation: keep full payloads of orders and calls for the app's review. */
	keepPayloads?(): Promise<boolean>;
	/** `known` tells items already on the app (updated) from new ones (created). */
	syncMenu?(
		menu: ChannelMenu,
		known: (sku: string) => boolean
	): Promise<SyncReport & { synced: string[] }>;
	setAvailability?(items: { externalId: string; available: boolean }[]): Promise<void>;
	/** Readable text for an error thrown by this adapter. */
	describeError?(err: unknown): string;
}

const INTEGRATION: Actor = { type: 'integration', id: null };
const FORWARD: OrderStatus[] = ['new', 'confirmed', 'preparing', 'ready', 'completed'];

/** Stores events once each and queues them for processing. Returns how many were new. */
export async function storeChannelEvents(
	adapter: ChannelAdapter,
	events: ChannelEvent[],
	method: 'webhook' | 'polling',
	signatureValid: boolean | null
) {
	let stored = 0;
	await db().begin(async (tx) => {
		for (const e of events) {
			if (!e?.id || !e.type) continue;
			const inserted = await tx<{ id: string }[]>`
				insert into channel_events (channel, provider_event_id, event_type, channel_order_id, delivery_method, signature_valid, payload)
				values (${adapter.channel}, ${e.id}, ${e.type}, ${e.orderId ?? null}, ${method}, ${signatureValid}, ${tx.json(e.raw as never)})
				on conflict (channel, provider_event_id) do nothing
				returning id`;
			if (inserted.length) {
				stored++;
				await enqueue(
					tx,
					adapter.queues.event,
					{ channelEventId: inserted[0].id },
					{ singletonKey: `${adapter.channel}-event:${inserted[0].id}` }
				);
			}
		}
	});
	return stored;
}

/**
 * One polling round. Events are committed to our database first and only then
 * acknowledged, so a crash between the two re-delivers instead of losing an order.
 */
export async function pollChannelOnce(adapter: ChannelAdapter) {
	if (!adapter.pollEvents) return { received: 0, stored: 0 };
	const events = await adapter.pollEvents();
	if (!events.length) return { received: 0, stored: 0 };
	const stored = await storeChannelEvents(adapter, events, 'polling', null);
	const ids = events.map((e) => e.id).filter(Boolean);
	await adapter.ackEvents(ids);
	await db()`update channel_events set acknowledged_at = now()
		where channel = ${adapter.channel} and provider_event_id = any(${ids}) and acknowledged_at is null`;
	return { received: events.length, stored };
}

/** Our product for an app's item code: integration_mappings first, else the code is our SKU. */
async function productLookup(
	adapter: ChannelAdapter
): Promise<(code: string) => ProductInfo | null> {
	const mappings = await db()<
		{ internal_sku: string; external_code: string | null; external_id: string }[]
	>`
		select internal_sku, external_code, external_id from integration_mappings
		where channel = ${adapter.channel} and entity_type = 'product'`;
	const byCode = new Map<string, string>();
	for (const m of mappings) {
		byCode.set(m.external_id, m.internal_sku);
		if (m.external_code) byCode.set(m.external_code, m.internal_sku);
	}
	let catalog: Awaited<ReturnType<typeof getCatalog>> | null = null;
	try {
		catalog = await getCatalog();
	} catch {
		// The order must still be created if the menu service is down.
	}
	return (code) => {
		const sku = byCode.get(code) ?? code;
		const p = catalog?.products.find((x) => x.sku === sku);
		if (!p) return null;
		return {
			sku: p.sku,
			prepStation: p.prepStation,
			categoryName: catalog!.categories.find((c) => c.id === p.categoryId)?.name ?? null
		};
	};
}

async function markEvent(
	id: string,
	status: 'processed' | 'ignored' | 'failed' | 'dead',
	error: string | null = null
) {
	await db()`update channel_events set processing_status = ${status}, error = ${error},
		processed_at = case when ${status} in ('processed','ignored') then now() else processed_at end
		where id = ${id}`;
}

function findOrder(adapter: ChannelAdapter, channelOrderId: string) {
	return db()<{ id: string; status: OrderStatus; cancel_request_reason: string | null }[]>`
		select id, status, cancel_request_reason from orders where channel = ${adapter.orderChannel}
			and channel_partner is not distinct from ${adapter.partner}
			and channel_order_id = ${channelOrderId}`;
}

/** Worker: apply one stored event. */
export async function processChannelEvent(adapter: ChannelAdapter, channelEventId: string) {
	const sql = db();
	const [ev] = await sql<
		{
			id: string;
			event_type: string;
			channel_order_id: string | null;
			processing_status: string;
			attempts: number;
		}[]
	>`
		update channel_events set attempts = attempts + 1 where id = ${channelEventId}
		returning id, event_type, channel_order_id, processing_status, attempts`;
	if (!ev || ev.processing_status === 'processed' || ev.processing_status === 'ignored')
		return 'skipped';
	if (!ev.channel_order_id) {
		await markEvent(ev.id, 'ignored', 'event without orderId');
		return 'ignored';
	}

	try {
		const meaning = adapter.meaning(ev.event_type);
		if (meaning.kind === 'placed') {
			// The order detail can lag the event by a few seconds; a 404 throws and pg-boss retries with backoff.
			const mapped = await adapter.getOrder(ev.channel_order_id, await productLookup(adapter));
			if (mapped.raw !== undefined && (await adapter.keepPayloads?.())) {
				await sql`update channel_events set detail = ${sql.json(mapped.raw as never)} where id = ${ev.id}`;
			}
			const order = await createOrder({
				channel: adapter.orderChannel,
				channelPartner: adapter.partner,
				sourceMode: adapter.sourceMode,
				lines: [],
				externalPricing: {
					cart: mapped.cart,
					deliveryFeeCents: mapped.deliveryFeeCents,
					discountCents: mapped.discountCents
				},
				fulfillmentType: mapped.fulfillmentType,
				fulfillmentProvider: mapped.fulfillmentProvider,
				customer: mapped.customer,
				customerLabel: mapped.customerLabel,
				address: mapped.address,
				notes: mapped.notes,
				idempotencyKey: `${adapter.channel === 'ifood' ? 'ifood' : adapter.channel}:${mapped.channelOrderId}`,
				channelOrderId: mapped.channelOrderId,
				channelDisplayId: mapped.displayId,
				initialStatus: 'new',
				isTest: mapped.isTest,
				paymentStatus: mapped.paymentStatus,
				paymentPlan: 'channel',
				actor: INTEGRATION
			});
			if (
				order.created &&
				(mapped.unmappedCodes.length || order.totalCents !== mapped.channelTotalCents)
			) {
				await audit(sql, INTEGRATION, `${adapter.channel}.mapping_warning`, 'order', order.id, {
					unmappedCodes: mapped.unmappedCodes,
					ourTotalCents: order.totalCents,
					channelTotalCents: mapped.channelTotalCents
				});
			}
			await markEvent(ev.id, 'processed');
			return 'created';
		}

		if (meaning.kind === 'ignore') {
			await markEvent(ev.id, 'ignored', `no action for ${ev.event_type}`);
			return 'ignored';
		}
		const [order] = await findOrder(adapter, ev.channel_order_id);
		if (order && meaning.kind === 'cancelDenied') {
			await sql`update orders set cancel_requested_at = null where id = ${order.id}`;
			await audit(sql, INTEGRATION, 'order.cancel_denied', 'order', order.id, {
				channel: adapter.channel
			});
			await markEvent(ev.id, 'processed');
			return 'processed';
		}
		if (!order) {
			// The "placed" event may still be in flight; retry a few times before giving up.
			if (ev.attempts < 5) throw new Error('order not created yet');
			await markEvent(ev.id, 'ignored', 'order unknown');
			return 'ignored';
		}
		if (meaning.kind !== 'status') {
			await markEvent(ev.id, 'ignored', 'order unknown');
			return 'ignored';
		}
		await applyStatus(adapter, order, meaning.to, ev.id);
		await markEvent(ev.id, 'processed');
		return 'processed';
	} catch (err) {
		const msg = adapter.describeError?.(err) ?? String(err);
		await markEvent(ev.id, ev.attempts >= 8 ? 'dead' : 'failed', msg);
		throw err;
	}
}

async function applyStatus(
	adapter: ChannelAdapter,
	order: { id: string; status: OrderStatus; cancel_request_reason: string | null },
	target: OrderStatus,
	eventId: string
) {
	const orderId = order.id;
	const current = order.status;
	if (current === target) return;
	if (target === 'cancelled') {
		if (canTransition(current, 'cancelled')) {
			await transitionOrder({
				orderId,
				to: 'cancelled',
				actor: INTEGRATION,
				reason: order.cancel_request_reason ?? `Cancelado pelo ${adapter.label}`,
				sourceEventId: eventId
			});
		}
		return;
	}
	// Walk forward through intermediate states so history and timestamps stay complete.
	const from = FORWARD.indexOf(current);
	const to = FORWARD.indexOf(target);
	if (from < 0 || to <= from) return;
	for (const step of FORWARD.slice(from + 1, to + 1)) {
		await transitionOrder({
			orderId,
			to: step,
			actor: INTEGRATION,
			reason: `Atualizado pelo ${adapter.label}`,
			sourceEventId: eventId
		});
	}
}

/** Worker: tell the app about a status change made in our system, once per order and action. */
export async function syncOrderToChannel(
	adapter: ChannelAdapter,
	data: { orderId: string; to: OrderStatus; reason?: string | null }
) {
	const sql = db();
	const [o] = await sql<
		{
			channel_order_id: string | null;
			fulfillment_type: string;
			fulfillment_provider: string;
			is_test: boolean;
		}[]
	>`
		select channel_order_id, fulfillment_type, fulfillment_provider, is_test from orders
		where id = ${data.orderId} and channel = ${adapter.orderChannel}
			and channel_partner is not distinct from ${adapter.partner}`;
	if (!o?.channel_order_id) return 'skipped';
	const ref: OrderRef = {
		id: data.orderId,
		channelOrderId: o.channel_order_id,
		fulfillmentType: o.fulfillment_type,
		fulfillmentProvider: o.fulfillment_provider,
		isTest: o.is_test
	};
	const call = adapter.planStatus(ref, data.to, data.reason ?? null);
	if (!call) return 'skipped';
	const [row] = await sql<{ id: string; status: string }[]>`
		insert into channel_outbound (channel, order_id, action, request, status)
		values (${adapter.channel}, ${data.orderId}, ${call.action}, ${call.body ? sql.json(call.body as never) : null},
			${(await adapter.enabled()) ? 'pending' : 'skipped'})
		on conflict (order_id, action) do update set attempts = channel_outbound.attempts
		returning id, status`;
	if (row.status === 'sent' || row.status === 'skipped') return row.status;
	try {
		const answer = await adapter.sendStatus(ref, call);
		const response =
			answer !== undefined && (await adapter.keepPayloads?.())
				? JSON.stringify(answer).slice(0, 20_000)
				: null;
		await sql`update channel_outbound set status = 'sent', sent_at = now(), attempts = attempts + 1,
			last_error = null, response = ${response} where id = ${row.id}`;
		return 'sent';
	} catch (err) {
		await sql`update channel_outbound set status = 'failed', attempts = attempts + 1, last_error = ${String(err)} where id = ${row.id}`;
		throw err;
	}
}

/** Manager action: run a stored event again (after a fix or a mapping change). */
export async function replayStoredEvent(adapter: ChannelAdapter, id: string, actor: Actor) {
	await db().begin(async (tx) => {
		const [ev] = await tx<{ id: string }[]>`
			update channel_events set processing_status = 'received', error = null
			where id = ${id} and channel = ${adapter.channel} and processing_status <> 'processed'
			returning id`;
		if (!ev) return;
		await enqueue(tx, adapter.queues.event, { channelEventId: id });
		await audit(tx, actor, 'channel_event.replayed', 'channel_event', id);
	});
}
