// Background job handlers. The worker process (scripts/worker.ts) registers
// these with pg-boss; they are plain functions so tests can call them directly.
// Every handler is idempotent because pg-boss delivers at least once.
import { db } from '../db';
import { getBoss, QUEUES } from '../jobs';
import { sendReadyPush } from '../notifications/push';
import { expireUnpaidCheckouts, processPaymentEvent } from '../payments/online';

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
}

/** The kitchen marked the order ready, or staff tapped "Chamar": tell the customer's phone. */
export async function handleOrderReady(data: { orderId: string }) {
	const result = await sendReadyPush(data.orderId);
	if (result.sent || result.failed) log('ready alert', { orderId: data.orderId, ...result });
}

export async function handlePaymentEvent(data: { paymentEventId: string }) {
	await processPaymentEvent(data.paymentEventId);
}

/** Runs every minute: expire unpaid online checkouts and flag orders waiting too long. */
export async function handleStaleOrders() {
	const expired = await expireUnpaidCheckouts();
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

type Handler = (data: never) => Promise<unknown>;

export async function startWorker(extra: Partial<Record<string, Handler>> = {}) {
	const boss = await getBoss();
	const handlers: Record<string, Handler> = {
		[QUEUES.orderPlaced]: handleOrderPlaced as Handler,
		[QUEUES.orderReady]: handleOrderReady as Handler,
		[QUEUES.paymentEvent]: handlePaymentEvent as Handler,
		[QUEUES.staleOrders]: handleStaleOrders as Handler,
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
						await handler(job.data as never);
					} catch (err) {
						log('job failed', { queue: name, jobId: job.id, err: String(err) });
						throw err;
					}
				}
			}
		);
	}
	await boss.schedule(QUEUES.staleOrders, '* * * * *', {}, { tz: 'America/Sao_Paulo' });
	log('worker started', { queues: Object.keys(handlers) });
	return boss;
}
