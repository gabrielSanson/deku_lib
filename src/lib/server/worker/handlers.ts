// Background job handlers. The worker process (scripts/worker.ts) registers
// these with pg-boss; they are plain functions so tests can call them directly.
// Every handler is idempotent because pg-boss delivers at least once.
import { requestRating } from '../customers/ratings';
import { beat } from '../alerts/service';
import { config } from '../config';
import { db, DEFAULT_SHOP_ID, withShop } from '../db';
import { issueFiscalForOrder } from '../fiscal/service';
import { getBoss, QUEUES } from '../jobs';
import { applyLateStatuses, createMonthlyInvoices } from '../platform/billing';
import { getShop, openShops, syncTenancy } from '../platform/shops';
import { sendReadyPush } from '../notifications/push';
import { sendOutboxMessage } from '../messaging/outbox';
import { issueBirthdayCoupons, processMilestones } from '../campaigns/milestones';
import {
	notifyOrderEvent,
	processWhatsappInbound,
	type OrderMessageEvent
} from '../whatsapp/service';
import { expireUnpaidCheckouts, expireUnpaidOrders, processPaymentEvent } from '../payments/online';

function log(msg: string, extra: Record<string, unknown> = {}) {
	console.log(JSON.stringify({ at: new Date().toISOString(), msg, ...extra }));
}

/**
 * Follow-up for a new order. Notifications (WhatsApp/e-mail) and the optional
 * print agent hook in here; neither is configured yet, so this only records
 * that the order reached the worker.
 */
export async function handleOrderPlaced(data: { orderId: string }) {
	const [o] = await db()<{ order_number: number; channel: string; status: string }[]>`
		select order_number, channel, status from orders where id = ${data.orderId}`;
	if (!o) return;
	log('order placed', {
		orderId: data.orderId,
		orderNumber: o.order_number,
		channel: o.channel,
		status: o.status
	});
	await notifyOrderEvent(data.orderId, 'placed');
	// An order placed already paid (a full discount) earns its stamp here.
	await processMilestones(data.orderId);
}

/** The kitchen marked the order ready, or staff tapped "Chamar": tell the customer's phone. */
export async function handleOrderReady(data: { orderId: string }) {
	const result = await sendReadyPush(data.orderId);
	if (result.sent || result.failed) log('ready alert', { orderId: data.orderId, ...result });
}

/** A paid order gets its NFC-e. Provider errors throw, so pg-boss retries with backoff. */
export async function handleFiscalIssue(data: { orderId: string }) {
	const result = await issueFiscalForOrder(data.orderId);
	if (!('skipped' in result)) log('fiscal note', { orderId: data.orderId, ...result });
}

export async function handlePaymentEvent(data: { paymentEventId: string }) {
	await processPaymentEvent(data.paymentEventId);
}

/** Runs every minute: expire unpaid checkouts and Pix/totem orders, flag orders waiting too long. */
export async function handleStaleOrders() {
	const expired = (await expireUnpaidCheckouts()) + (await expireUnpaidOrders());
	const waiting = await db()<
		{ id: string; order_number: number; channel: string; minutes: number }[]
	>`
		select id, order_number, channel, floor(extract(epoch from now() - created_at) / 60)::int as minutes
		from orders where status = 'new' and is_test = false and created_at < now() - interval '5 minutes'
		order by created_at limit 20`;
	for (const w of waiting)
		log('order waiting for confirmation', {
			orderId: w.id,
			orderNumber: w.order_number,
			channel: w.channel,
			minutes: w.minutes
		});
	return { expired, waiting: waiting.length };
}

/** 1st of the month, 06:00: invoices for hosted shops (multi-shop installs only). */
export async function handleBillingMonthly() {
	if (config().TENANCY !== 'multi') return { skipped: true };
	const r = await createMonthlyInvoices();
	log('invoices created', r);
	return r;
}

/** Every day, 07:00: warn and then suspend shops with late invoices. */
export async function handleBillingDaily() {
	if (config().TENANCY !== 'multi') return { skipped: true };
	return applyLateStatuses();
}

/** Runs every minute: tells the watchdog the worker is alive. */
export async function handleHeartbeat() {
	await beat('worker', { pid: process.pid });
}

type Handler = (data: never) => Promise<unknown>;

/** The shops background work runs for: every open shop in multi-shop mode, else the default one. */
export async function activeShopIds(): Promise<string[]> {
	if (config().TENANCY !== 'multi') {
		await getShop(DEFAULT_SHOP_ID);
		return [DEFAULT_SHOP_ID];
	}
	return (await openShops()).map((s) => s.id);
}

/** A scheduled job that runs once per shop; one shop failing does not stop the others. */
function forEachShop(fn: () => Promise<unknown>) {
	return async () => {
		let failed: unknown;
		for (const shopId of await activeShopIds()) {
			try {
				await withShop(shopId, () => fn());
			} catch (err) {
				log('scheduled job failed for a shop', { shopId, err: String(err) });
				failed ??= err;
			}
		}
		if (failed) throw failed;
	};
}

export async function startWorker(extra: Partial<Record<string, Handler>> = {}) {
	await syncTenancy();
	const boss = await getBoss();
	const handlers: Record<string, Handler> = {
		[QUEUES.orderPlaced]: handleOrderPlaced as Handler,
		[QUEUES.orderReady]: handleOrderReady as Handler,
		[QUEUES.paymentEvent]: handlePaymentEvent as Handler,
		[QUEUES.fiscalIssue]: handleFiscalIssue as Handler,
		[QUEUES.staleOrders]: forEachShop(handleStaleOrders) as Handler,
		[QUEUES.heartbeat]: handleHeartbeat as Handler,
		[QUEUES.billingMonthly]: handleBillingMonthly as Handler,
		[QUEUES.billingDaily]: handleBillingDaily as Handler,
		[QUEUES.whatsappInbound]: ((d: { channelEventId: string }) =>
			processWhatsappInbound(d.channelEventId)) as Handler,
		[QUEUES.whatsappNotify]: ((d: { orderId: string; event: OrderMessageEvent }) =>
			notifyOrderEvent(d.orderId, d.event)) as Handler,
		[QUEUES.campaignMilestones]: ((d: { orderId: string }) =>
			processMilestones(d.orderId)) as Handler,
		[QUEUES.campaignBirthdays]: forEachShop(() => issueBirthdayCoupons()) as Handler,
		[QUEUES.ratingRequest]: ((d: { orderId: string }) => requestRating(d.orderId)) as Handler,
		[QUEUES.whatsappSend]: ((d: { outboxId: string }) => sendOutboxMessage(d.outboxId)) as Handler,
		...extra
	};
	for (const [name, handler] of Object.entries(handlers)) {
		if (!handler) continue;
		await boss.work<Record<string, unknown>>(
			name,
			{ pollingIntervalSeconds: 1, batchSize: 5 },
			async (jobs) => {
				for (const job of jobs) {
					try {
						// Jobs carry the shop that queued them; older jobs belong to the default shop.
						const shopId = typeof job.data?.shopId === 'string' ? job.data.shopId : DEFAULT_SHOP_ID;
						await withShop(shopId, () => handler(job.data as never));
					} catch (err) {
						log('job failed', { queue: name, jobId: job.id, err: String(err) });
						throw err;
					}
				}
			}
		);
	}
	await boss.schedule(QUEUES.staleOrders, '* * * * *', {}, { tz: 'America/Sao_Paulo' });
	await boss.schedule(QUEUES.heartbeat, '* * * * *', {}, { tz: 'America/Sao_Paulo' });
	await boss.schedule(QUEUES.billingMonthly, '0 6 1 * *', {}, { tz: 'America/Sao_Paulo' });
	await boss.schedule(QUEUES.billingDaily, '0 7 * * *', {}, { tz: 'America/Sao_Paulo' });
	await boss.schedule(QUEUES.campaignBirthdays, '0 8 * * *', {}, { tz: 'America/Sao_Paulo' });
	await handleHeartbeat();
	log('worker started', { queues: Object.keys(handlers) });
	return boss;
}
