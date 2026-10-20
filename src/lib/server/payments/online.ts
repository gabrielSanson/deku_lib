// Online checkout lifecycle: start a payment, ingest provider webhooks,
// apply them idempotently, and expire checkouts that were never paid.
import { audit, SYSTEM } from '../audit';
import { db, type Tx } from '../db';
import { DomainError } from '../errors';
import { enqueue, QUEUES } from '../jobs';
import { transitionOrder } from '../orders/service';
import {
	paymentProvider,
	providerByName,
	type OnlineMethod,
	type ProviderPaymentStatus
} from './provider';
import { refreshPaymentStatus } from './tenders';

export async function startOnlinePayment(input: {
	orderId: string;
	method: OnlineMethod;
	idempotencyKey: string;
	returnUrl: string;
}) {
	const provider = paymentProvider();
	if (!provider || !provider.methods.includes(input.method)) {
		throw new DomainError(
			'Pagamento online indisponível. Escolha pagar na retirada.',
			'no_provider',
			503
		);
	}
	const sql = db();
	const [existing] = await sql<
		{
			id: string;
			provider_reference: string;
			provider_payload: { pixCode?: string; redirectUrl?: string } | null;
			expires_at: Date;
			status: string;
		}[]
	>`
		select id, provider_reference, provider_payload, expires_at, status from tenders
		where idempotency_key = ${input.idempotencyKey}`;
	if (existing)
		return { tenderId: existing.id, ...existing.provider_payload, expiresAt: existing.expires_at };

	const [order] = await sql<
		{
			order_number: number;
			total_cents: number;
			status: string;
			payment_status: string;
			customer_label: string | null;
		}[]
	>`
		select order_number, total_cents, status, payment_status, customer_label from orders where id = ${input.orderId}`;
	if (!order) throw new DomainError('Pedido não encontrado.', 'not_found', 404);
	if (order.payment_status === 'paid')
		throw new DomainError('Este pedido já está pago.', 'paid', 409);
	if (order.status === 'cancelled' || order.status === 'rejected')
		throw new DomainError('Pedido cancelado.', 'cancelled', 409);

	const checkout = await provider.createCheckout({
		orderId: input.orderId,
		orderNumber: order.order_number,
		amountCents: order.total_cents,
		method: input.method,
		idempotencyKey: input.idempotencyKey,
		customer: { name: order.customer_label ?? 'Cliente' },
		returnUrl: input.returnUrl
	});
	const payload = { pixCode: checkout.pixCode, redirectUrl: checkout.redirectUrl };
	const [tender] = await sql<{ id: string }[]>`
		insert into tenders (order_id, method, provider, provider_reference, amount_cents, status, idempotency_key,
			provider_payload, expires_at)
		values (${input.orderId}, ${input.method}, ${provider.name}, ${checkout.providerPaymentId}, ${order.total_cents},
			'pending', ${input.idempotencyKey}, ${sql.json(payload)}, ${checkout.expiresAt})
		on conflict (idempotency_key) do update set idempotency_key = excluded.idempotency_key
		returning id`;
	await refreshPaymentStatus(sql, input.orderId);
	return { tenderId: tender.id, ...payload, expiresAt: checkout.expiresAt };
}

/** Webhook receiver: verify on raw bytes, store once, enqueue, answer fast. */
export async function receivePaymentWebhook(
	providerName: string,
	rawBody: Uint8Array,
	headers: Headers
) {
	const provider = providerByName(providerName);
	if (!provider) return { status: 404 };
	const valid = await provider.verifyWebhook(rawBody, headers);
	if (!valid) {
		console.warn(
			JSON.stringify({ msg: 'payment webhook signature rejected', provider: providerName })
		);
		return { status: 401 };
	}
	const event = provider.parseWebhook(rawBody);
	await db().begin(async (tx) => {
		const inserted = await tx<{ id: string }[]>`
			insert into payment_events (provider, provider_event_id, event_type, signature_valid, payload)
			values (${providerName}, ${event.eventId}, ${event.eventType}, true, ${tx.json(event as never)})
			on conflict (provider, provider_event_id) do nothing
			returning id`;
		if (inserted.length) await enqueue(tx, QUEUES.paymentEvent, { paymentEventId: inserted[0].id });
	});
	return { status: 200 };
}

/** Worker: apply one stored provider event. Safe to run more than once. */
export async function processPaymentEvent(paymentEventId: string) {
	await db().begin(async (tx) => {
		const [ev] = await tx<
			{
				provider: string;
				payload: { providerPaymentId: string; status: ProviderPaymentStatus };
				processing_status: string;
			}[]
		>`
			select provider, payload, processing_status from payment_events where id = ${paymentEventId} for update`;
		if (!ev || ev.processing_status === 'processed') return;
		await applyProviderStatus(tx, ev.provider, ev.payload.providerPaymentId, ev.payload.status);
		await tx`update payment_events set processing_status = 'processed', processed_at = now(), attempts = attempts + 1
			where id = ${paymentEventId}`;
	});
}

export async function applyProviderStatus(
	tx: Tx,
	provider: string,
	providerPaymentId: string,
	status: ProviderPaymentStatus
) {
	const [tender] = await tx<{ id: string; order_id: string; status: string }[]>`
		select id, order_id, status from tenders where provider = ${provider} and provider_reference = ${providerPaymentId} for update`;
	if (!tender) return;
	// Never move backwards from a settled state on a late or replayed event.
	const settled = ['paid', 'refunded'];
	if (tender.status === status || (settled.includes(tender.status) && status !== 'refunded'))
		return;
	await tx`
		update tenders set status = ${status},
			confirmed_at = case when ${status} = 'paid' then now() else confirmed_at end,
			refunded_at = case when ${status} = 'refunded' then now() else refunded_at end
		where id = ${tender.id}`;
	await audit(tx, { type: 'integration', id: null }, `tender.${status}`, 'order', tender.order_id, {
		provider,
		providerPaymentId
	});
	const paymentStatus = await refreshPaymentStatus(tx, tender.order_id);
	if (paymentStatus === 'paid') {
		const [o] = await tx<
			{ status: string; payment_plan: string }[]
		>`select status, payment_plan from orders where id = ${tender.order_id}`;
		// Paid online orders go straight to the kitchen.
		if (o.status === 'new' && o.payment_plan === 'online') {
			await transitionOrder(
				{
					orderId: tender.order_id,
					to: 'confirmed',
					actor: SYSTEM,
					reason: 'Pagamento online confirmado'
				},
				tx
			);
		}
	}
}

/** Worker: cancel online-only orders whose checkout expired unpaid. */
export async function expireUnpaidCheckouts() {
	const sql = db();
	const stale = await sql<
		{ order_id: string; id: string; provider: string; provider_reference: string }[]
	>`
		select t.order_id, t.id, t.provider, t.provider_reference from tenders t join orders o on o.id = t.order_id
		where t.status = 'pending' and t.expires_at < now() - interval '2 minutes'
			and o.payment_plan = 'online' and o.status = 'new'
		limit 50`;
	for (const t of stale) {
		const provider = providerByName(t.provider);
		// Ask the provider before giving up: a missed webhook must not cancel a paid order.
		const live = provider ? await provider.getStatus(t.provider_reference) : 'pending';
		await sql.begin(async (tx) => {
			if (live === 'paid') {
				await applyProviderStatus(tx, t.provider, t.provider_reference, 'paid');
				return;
			}
			await tx`update tenders set status = 'cancelled' where id = ${t.id} and status = 'pending'`;
			await refreshPaymentStatus(tx, t.order_id);
			await transitionOrder(
				{
					orderId: t.order_id,
					to: 'cancelled',
					actor: SYSTEM,
					reason: 'Pagamento não concluído a tempo'
				},
				tx
			);
		});
	}
	return stale.length;
}
