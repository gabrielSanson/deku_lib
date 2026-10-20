// iFood channel: ingest events (webhook or polling), turn them into orders and
// status changes, and mirror our status changes back to iFood.
// Every inbound event is stored in channel_events before anything else happens,
// and everything here is safe to run more than once.
import { canTransition, type OrderStatus } from '#lib/domain/order-status.ts';
import { audit, type Actor } from '../../audit';
import { getCatalog } from '../../catalog/service';
import { config } from '../../config';
import { db } from '../../db';
import { enqueue, QUEUES } from '../../jobs';
import { createOrder, transitionOrder } from '../../orders/service';
import {
	IFOOD_PATHS,
	ifoodClient,
	IfoodApiError,
	verifyIfoodSignature,
	type IfoodClient,
	type IfoodEvent
} from './api';
import {
	isPlaced,
	mapIfoodOrder,
	outboundAction,
	statusForEvent,
	type IfoodOrder,
	type ProductInfo
} from './mapping';

const IFOOD: Actor = { type: 'integration', id: null };
const FORWARD: OrderStatus[] = ['new', 'confirmed', 'preparing', 'ready', 'completed'];

export function ifoodEnabled() {
	return config().IFOOD_ENABLED;
}

async function storeEvents(
	events: IfoodEvent[],
	method: 'webhook' | 'polling',
	signatureValid: boolean | null
) {
	let stored = 0;
	await db().begin(async (tx) => {
		for (const e of events) {
			if (!e?.id || !e.code) continue;
			const inserted = await tx<{ id: string }[]>`
				insert into channel_events (channel, provider_event_id, event_type, channel_order_id, delivery_method, signature_valid, payload)
				values ('ifood', ${e.id}, ${e.code}, ${e.orderId ?? null}, ${method}, ${signatureValid}, ${tx.json(e as never)})
				on conflict (channel, provider_event_id) do nothing
				returning id`;
			if (inserted.length) {
				stored++;
				await enqueue(
					tx,
					QUEUES.ifoodEvent,
					{ channelEventId: inserted[0].id },
					{ singletonKey: `ifood-event:${inserted[0].id}` }
				);
			}
		}
	});
	return stored;
}

/** Webhook receiver: verify the signature on raw bytes, persist, enqueue, answer 202. */
export async function receiveIfoodWebhook(rawBody: Uint8Array, headers: Headers) {
	if (!ifoodEnabled()) return { status: 404 };
	if (!verifyIfoodSignature(rawBody, headers.get('x-ifood-signature'))) {
		console.warn(JSON.stringify({ msg: 'ifood webhook signature rejected' }));
		return { status: 401 };
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(new TextDecoder().decode(rawBody));
	} catch {
		return { status: 400 };
	}
	const events = (Array.isArray(parsed) ? parsed : [parsed]) as IfoodEvent[];
	await storeEvents(events, 'webhook', true);
	return { status: 202 };
}

/**
 * One polling round. Events are committed to our database first and only then
 * acknowledged, so a crash between the two re-delivers instead of losing an order.
 */
export async function pollIfoodOnce(client: IfoodClient = ifoodClient()) {
	const events = await client.poll();
	if (!events.length) return { received: 0, stored: 0 };
	const stored = await storeEvents(events, 'polling', null);
	const ids = events.map((e) => e.id).filter(Boolean);
	await client.acknowledge(ids);
	await db()`update channel_events set acknowledged_at = now()
		where channel = 'ifood' and provider_event_id = any(${ids}) and acknowledged_at is null`;
	return { received: events.length, stored };
}

async function productLookup(): Promise<(code: string) => ProductInfo | null> {
	const sql = db();
	const mappings = await sql<
		{ internal_sku: string; external_code: string | null; external_id: string }[]
	>`
		select internal_sku, external_code, external_id from integration_mappings where channel = 'ifood' and entity_type = 'product'`;
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

/** Worker: apply one stored iFood event. */
export async function processIfoodEvent(
	channelEventId: string,
	client: IfoodClient = ifoodClient()
) {
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
		if (isPlaced(ev.event_type)) {
			// The order detail can lag the event by a few seconds; a 404 throws and pg-boss retries with backoff.
			const payload = (await client.order(ev.channel_order_id)) as IfoodOrder;
			const mapped = mapIfoodOrder(payload, await productLookup());
			const order = await createOrder({
				channel: 'ifood',
				sourceMode: 'ifood_api',
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
				idempotencyKey: `ifood:${mapped.channelOrderId}`,
				channelOrderId: mapped.channelOrderId,
				channelDisplayId: mapped.displayId,
				initialStatus: 'new',
				isTest: mapped.isTest,
				paymentStatus: mapped.paymentStatus,
				paymentPlan: 'channel',
				actor: IFOOD
			});
			if (
				order.created &&
				(mapped.unmappedCodes.length || order.totalCents !== mapped.channelTotalCents)
			) {
				await audit(sql, IFOOD, 'ifood.mapping_warning', 'order', order.id, {
					unmappedCodes: mapped.unmappedCodes,
					ourTotalCents: order.totalCents,
					ifoodTotalCents: mapped.channelTotalCents
				});
			}
			await markEvent(ev.id, 'processed');
			return 'created';
		}

		const target = statusForEvent(ev.event_type);
		if (!target) {
			await markEvent(ev.id, 'ignored', `no action for ${ev.event_type}`);
			return 'ignored';
		}
		const [order] = await sql<{ id: string; status: OrderStatus }[]>`
			select id, status from orders where channel = 'ifood' and channel_order_id = ${ev.channel_order_id}`;
		if (!order) {
			// The PLACED event may still be in flight; retry a few times before giving up.
			if (ev.attempts < 5) throw new Error('order not created yet');
			await markEvent(ev.id, 'ignored', 'order unknown');
			return 'ignored';
		}
		await applyStatus(order.id, order.status, target, ev.id);
		await markEvent(ev.id, 'processed');
		return 'processed';
	} catch (err) {
		const msg = err instanceof IfoodApiError ? `${err.message} (${err.status})` : String(err);
		await markEvent(ev.id, ev.attempts >= 8 ? 'dead' : 'failed', msg);
		throw err;
	}
}

async function applyStatus(
	orderId: string,
	current: OrderStatus,
	target: OrderStatus,
	eventId: string
) {
	if (current === target) return;
	if (target === 'cancelled') {
		if (canTransition(current, 'cancelled')) {
			await transitionOrder({
				orderId,
				to: 'cancelled',
				actor: IFOOD,
				reason: 'Cancelado pelo iFood',
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
			actor: IFOOD,
			reason: 'Atualizado pelo iFood',
			sourceEventId: eventId
		});
	}
}

/** Worker: tell iFood about a status change made in our system. */
export async function syncOrderToIfood(
	data: { orderId: string; to: OrderStatus; reason?: string | null },
	client: IfoodClient = ifoodClient()
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
		select channel_order_id, fulfillment_type, fulfillment_provider, is_test from orders where id = ${data.orderId} and channel = 'ifood'`;
	if (!o?.channel_order_id) return 'skipped';
	const action = outboundAction(data.to, {
		type: o.fulfillment_type,
		provider: o.fulfillment_provider
	});
	if (!action) return 'skipped';
	const body =
		action === 'requestCancellation'
			? { reason: data.reason || 'Cancelado pela loja', cancellationCode: '501' } // UNVERIFIED: pick the code from iFood's cancellationReasons
			: undefined;
	const [row] = await sql<{ id: string; status: string }[]>`
		insert into channel_outbound (channel, order_id, action, request, status)
		values ('ifood', ${data.orderId}, ${action}, ${body ? sql.json(body) : null}, ${ifoodEnabled() ? 'pending' : 'skipped'})
		on conflict (order_id, action) do update set attempts = channel_outbound.attempts
		returning id, status`;
	if (row.status === 'sent' || row.status === 'skipped') return row.status;
	const path = IFOOD_PATHS[action](o.channel_order_id);
	try {
		await client.action(path, body);
		await sql`update channel_outbound set status = 'sent', sent_at = now(), attempts = attempts + 1, last_error = null where id = ${row.id}`;
		return 'sent';
	} catch (err) {
		await sql`update channel_outbound set status = 'failed', attempts = attempts + 1, last_error = ${String(err)} where id = ${row.id}`;
		throw err;
	}
}

/** Manager action: run a stored event again (after a fix or a mapping change). */
export async function replayChannelEvent(id: string, actor: Actor) {
	await db().begin(async (tx) => {
		const [ev] = await tx<{ id: string }[]>`
			update channel_events set processing_status = 'received', error = null where id = ${id} and processing_status <> 'processed'
			returning id`;
		if (!ev) return;
		await enqueue(tx, QUEUES.ifoodEvent, { channelEventId: id });
		await audit(tx, actor, 'channel_event.replayed', 'channel_event', id);
	});
}

export async function retryOutbound(id: string, actor: Actor) {
	await db().begin(async (tx) => {
		const [row] = await tx<{ order_id: string; action: string }[]>`
			update channel_outbound set status = 'pending' where id = ${id} and status = 'failed' returning order_id, action`;
		if (!row) return;
		const to: OrderStatus =
			(
				{
					confirm: 'confirmed',
					startPreparation: 'preparing',
					readyToPickup: 'ready',
					dispatch: 'ready',
					requestCancellation: 'cancelled'
				} as const
			)[row.action as 'confirm'] ?? 'confirmed';
		await enqueue(tx, QUEUES.ifoodSync, { orderId: row.order_id, to });
		await audit(tx, actor, 'channel_outbound.retried', 'order', row.order_id, {
			action: row.action
		});
	});
}

export async function integrationHealth() {
	const sql = db();
	const [summary] = await sql<
		{
			last_event: Date | null;
			last_poll_event: Date | null;
			failed: number;
			dead: number;
			today: number;
			waiting: number;
		}[]
	>`
		select
			(select max(received_at) from channel_events where channel = 'ifood') as last_event,
			(select max(received_at) from channel_events where channel = 'ifood' and delivery_method = 'polling') as last_poll_event,
			(select count(*)::int from channel_events where channel = 'ifood' and processing_status = 'failed') as failed,
			(select count(*)::int from channel_events where channel = 'ifood' and processing_status = 'dead') as dead,
			(select count(*)::int from channel_events where channel = 'ifood' and received_at > now() - interval '24 hours') as today,
			(select count(*)::int from orders where channel = 'ifood' and status = 'new') as waiting`;
	const events = await sql<
		{
			id: string;
			event_type: string;
			channel_order_id: string | null;
			delivery_method: string;
			processing_status: string;
			attempts: number;
			error: string | null;
			received_at: Date;
		}[]
	>`
		select id, event_type, channel_order_id, delivery_method, processing_status, attempts, error, received_at
		from channel_events where channel = 'ifood' order by received_at desc limit 50`;
	const outbound = await sql<
		{
			id: string;
			order_id: string;
			order_number: number;
			action: string;
			status: string;
			attempts: number;
			last_error: string | null;
			created_at: Date;
		}[]
	>`
		select c.id, c.order_id, o.order_number, c.action, c.status, c.attempts, c.last_error, c.created_at
		from channel_outbound c join orders o on o.id = c.order_id
		order by (c.status = 'failed') desc, c.created_at desc limit 30`;
	return { enabled: ifoodEnabled(), summary, events, outbound };
}
