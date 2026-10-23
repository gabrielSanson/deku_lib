// Records how an order was paid. In-person methods (cash, counter Pix checked
// by staff, an external card terminal or the PSP's Tap to Pay app) are manual
// tenders: staff confirm them and we store the provider reference.
import type { PaymentStatus, StaffRole } from '#lib/domain/order-status.ts';
import { audit, type Actor } from '../audit';
import { recordCashRefund, recordCashSale } from '../cash/service';
import { db, type Db, type Tx } from '../db';
import { DomainError } from '../errors';
import { confirmIfPaid } from '../orders/service';

export const MANUAL_METHODS = ['cash', 'external_pix', 'terminal_card', 'softpos_nfc'] as const;
export type ManualMethod = (typeof MANUAL_METHODS)[number];
export type TenderMethod = ManualMethod | 'pix' | 'online_card' | 'ifood_collected';

export { METHOD_LABEL_PT } from '#lib/domain/tender-labels.ts';

export interface ManualTenderInput {
	orderId: string;
	method: ManualMethod;
	amountCents: number;
	cashReceivedCents?: number | null;
	providerReference?: string | null;
	idempotencyKey: string;
	actor: Actor & { role: StaffRole };
}

export async function recordManualTender(input: ManualTenderInput) {
	if (input.actor.role === 'kitchen')
		throw new DomainError('Seu perfil não permite receber pagamentos.', 'forbidden', 403);
	if (input.amountCents <= 0) throw new DomainError('Valor inválido.');
	let change: number | null = null;
	if (input.method === 'cash') {
		const received = input.cashReceivedCents ?? input.amountCents;
		if (received < input.amountCents) throw new DomainError('Valor recebido menor que o total.');
		change = received - input.amountCents;
	} else if (!input.providerReference?.trim()) {
		// Without a reference nobody can reconcile the payment later.
		throw new DomainError('Informe o código/NSU da transação.', 'reference_required');
	}

	return db().begin(async (tx) => {
		const [order] = await tx<{ total_cents: number; status: string }[]>`
			select total_cents, status from orders where id = ${input.orderId} for update`;
		if (!order) throw new DomainError('Pedido não encontrado.', 'not_found', 404);
		if (order.status === 'cancelled' || order.status === 'rejected') {
			throw new DomainError('Pedido cancelado não recebe pagamento.');
		}
		const [already] = await tx<{ change_cents: number | null }[]>`
			select change_cents from tenders where idempotency_key = ${input.idempotencyKey}`;
		if (already) return { duplicate: true, changeCents: already.change_cents };
		const [{ paid }] = await tx<{ paid: number }[]>`
			select coalesce(sum(amount_cents), 0)::int as paid from tenders
			where order_id = ${input.orderId} and status = 'paid'`;
		if (paid + input.amountCents > order.total_cents) {
			throw new DomainError('O pagamento ultrapassa o total do pedido.');
		}
		const inserted = await tx<{ id: string }[]>`
			insert into tenders (order_id, method, provider, provider_reference, amount_cents, cash_received_cents,
				change_cents, status, idempotency_key, recorded_by, confirmed_at)
			values (${input.orderId}, ${input.method}, 'manual', ${input.providerReference?.trim() || null},
				${input.amountCents}, ${input.method === 'cash' ? (input.cashReceivedCents ?? input.amountCents) : null},
				${change}, 'paid', ${input.idempotencyKey}, ${input.actor.id}, now())
			on conflict (idempotency_key) do nothing
			returning id`;
		if (inserted.length === 0) return { duplicate: true, changeCents: change };
		// Cash kept from the sale goes into the open drawer; without one the sale is refused.
		if (input.method === 'cash')
			await recordCashSale(tx, inserted[0].id, input.amountCents, input.actor);
		await audit(tx, input.actor, 'tender.recorded', 'order', input.orderId, {
			method: input.method,
			amount_cents: input.amountCents,
			reference: input.providerReference ?? null
		});
		await refreshPaymentStatus(tx, input.orderId);
		// Counter sales and Pix-to-key orders reach the kitchen only once fully paid.
		await confirmIfPaid(tx, input.orderId, input.actor, 'Pagamento confirmado');
		return { duplicate: false, changeCents: change };
	});
}

export async function refundTender(
	tenderId: string,
	reason: string,
	actor: Actor & { role: StaffRole }
) {
	if (actor.role !== 'admin') {
		throw new DomainError('Somente um admin pode estornar.', 'forbidden', 403);
	}
	if (!reason.trim()) throw new DomainError('Informe o motivo do estorno.', 'reason_required');
	return db().begin(async (tx) => {
		const [t] = await tx<
			{ order_id: string; status: string; provider: string; method: string; amount_cents: number }[]
		>`
			select order_id, status, provider, method, amount_cents from tenders where id = ${tenderId} for update`;
		if (!t) throw new DomainError('Pagamento não encontrado.', 'not_found', 404);
		if (t.status !== 'paid')
			throw new DomainError('Só pagamentos confirmados podem ser estornados.');
		if (t.provider !== 'manual') {
			throw new DomainError(
				'Estorno online deve ser feito pelo provedor de pagamento.',
				'provider_refund'
			);
		}
		await tx`update tenders set status = 'refunded', refunded_at = now(), refund_reason = ${reason} where id = ${tenderId}`;
		if (t.method === 'cash') await recordCashRefund(tx, tenderId, t.amount_cents, actor);
		await audit(tx, actor, 'tender.refunded', 'order', t.order_id, { tender_id: tenderId, reason });
		await refreshPaymentStatus(tx, t.order_id);
	});
}

/** Derives orders.payment_status from its tenders. */
export async function refreshPaymentStatus(tx: Tx | Db, orderId: string): Promise<PaymentStatus> {
	const [o] = await tx<{ total_cents: number; payment_status: PaymentStatus }[]>`
		select total_cents, payment_status from orders where id = ${orderId}`;
	const rows = await tx<{ status: PaymentStatus; amount_cents: number }[]>`
		select status, amount_cents from tenders where order_id = ${orderId}`;
	const paid = rows.filter((r) => r.status === 'paid').reduce((n, r) => n + r.amount_cents, 0);
	let next: PaymentStatus;
	if (o.total_cents === 0 || paid >= o.total_cents) next = 'paid';
	else if (rows.some((r) => r.status === 'unknown')) next = 'unknown';
	else if (rows.length > 0 && rows.every((r) => r.status === 'refunded')) next = 'refunded';
	else if (rows.some((r) => r.status === 'pending') || paid > 0) next = 'pending';
	else if (rows.some((r) => r.status === 'failed')) next = 'failed';
	else next = o.payment_status === 'paid' ? 'paid' : 'pending';
	if (next !== o.payment_status) {
		await tx`update orders set payment_status = ${next} where id = ${orderId}`;
	}
	return next;
}
