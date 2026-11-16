// iFood channel: ingest events (webhook or polling), turn them into orders and
// status changes, and mirror our status changes back to iFood.
// Every inbound event is stored in channel_events before anything else happens,
// and everything here is safe to run more than once.
import type { OrderStatus } from '#lib/domain/order-status.ts';
import { audit, type Actor } from '../../audit';
import { db } from '../../db';
import { enqueue, QUEUES } from '../../jobs';
import {
	pollChannelOnce,
	processChannelEvent,
	replayStoredEvent,
	storeChannelEvents,
	syncOrderToChannel
} from '../channel';
import { ifoodAdapter, toChannelEvent } from './adapter';
import { ifoodClient, verifyIfoodSignature, type IfoodClient, type IfoodEvent } from './api';
import { ifoodSettings, ifoodStatus, type IfoodStatus } from './settings';

export async function ifoodEnabled() {
	return (await ifoodSettings()).enabled;
}

/** Webhook receiver: verify the signature on raw bytes, persist, enqueue, answer 202. */
export async function receiveIfoodWebhook(rawBody: Uint8Array, headers: Headers) {
	const settings = await ifoodSettings();
	if (!settings.enabled) return { status: 404 };
	if (!verifyIfoodSignature(rawBody, headers.get('x-ifood-signature'), settings.clientSecret)) {
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
	await storeChannelEvents(ifoodAdapter(), events.map(toChannelEvent), 'webhook', true);
	return { status: 202 };
}

/**
 * One polling round. Events are committed to our database first and only then
 * acknowledged, so a crash between the two re-delivers instead of losing an order.
 */
export async function pollIfoodOnce(client: IfoodClient = ifoodClient()) {
	return pollChannelOnce(ifoodAdapter(client));
}

/** Worker: apply one stored iFood event. */
export async function processIfoodEvent(
	channelEventId: string,
	client: IfoodClient = ifoodClient()
) {
	return processChannelEvent(ifoodAdapter(client), channelEventId);
}

/** Worker: tell iFood about a status change made in our system. */
export async function syncOrderToIfood(
	data: { orderId: string; to: OrderStatus; reason?: string | null },
	client: IfoodClient = ifoodClient()
) {
	return syncOrderToChannel(ifoodAdapter(client), data);
}

/** Manager action: run a stored event again (after a fix or a mapping change). */
export async function replayChannelEvent(id: string, actor: Actor) {
	await replayStoredEvent(ifoodAdapter(), id, actor);
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
	const status = await ifoodStatus();
	return { enabled: status.enabled, status, summary, events, outbound };
}

/** Problems the home screen should shout about while iFood is on. */
export function ifoodAlerts(
	status: IfoodStatus,
	counts: { failed: number; dead: number; outboundFailed: number },
	now = new Date()
): string[] {
	if (!status.enabled) return status.problem ? [status.problem] : [];
	const alerts: string[] = [];
	const errorIsLatest =
		status.lastPollErrorAt &&
		(!status.lastPollOkAt || status.lastPollErrorAt.getTime() > status.lastPollOkAt.getTime());
	if (errorIsLatest) {
		alerts.push(`O iFood não está respondendo: ${status.lastPollError ?? 'erro desconhecido'}`);
	} else if (!status.lastPollOkAt || now.getTime() - status.lastPollOkAt.getTime() > 3 * 60_000) {
		alerts.push(
			'Nenhuma consulta ao iFood deu certo nos últimos 3 minutos. Confira se o serviço de segundo plano (worker) está rodando.'
		);
	}
	if (counts.failed + counts.dead > 0)
		alerts.push(
			`${counts.failed + counts.dead} evento(s) do iFood não puderam ser processados. Veja em Configurações → Integrações.`
		);
	if (counts.outboundFailed > 0)
		alerts.push(
			`${counts.outboundFailed} atualização(ões) de status não chegaram ao iFood. Confirme no Gestor de Pedidos e tente de novo em Integrações.`
		);
	return alerts;
}

export async function currentIfoodAlerts() {
	const status = await ifoodStatus();
	if (!status.enabled && !status.problem) return [];
	const [counts] = await db()<{ failed: number; dead: number; outbound_failed: number }[]>`
		select
			(select count(*)::int from channel_events where channel = 'ifood' and processing_status = 'failed') as failed,
			(select count(*)::int from channel_events where channel = 'ifood' and processing_status = 'dead') as dead,
			(select count(*)::int from channel_outbound where channel = 'ifood' and status = 'failed') as outbound_failed`;
	return ifoodAlerts(status, {
		failed: counts.failed,
		dead: counts.dead,
		outboundFailed: counts.outbound_failed
	});
}
