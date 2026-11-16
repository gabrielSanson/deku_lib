// Order detail → "Cancelar e devolver" (S5.6): one action that gives the customer their money
// back, cancels the order (stock goes back, or is booked as waste once the kitchen started; a
// cancelled order leaves profit and sales) and cancels the NFC-e while SEFAZ still allows it.
// Online payments are refunded at the provider first; cash comes out of the open drawer.
// A delivered order stays completed and in the reports; only its payment shows as refunded.
import type { StaffRole } from '#lib/domain/order-status.ts';
import { TERMINAL_STATUSES, type OrderStatus } from '#lib/domain/order-status.ts';
import { audit, type Actor } from '../audit';
import { recordCashRefund } from '../cash/service';
import { db } from '../db';
import { DomainError } from '../errors';
import { cancelFiscal } from '../fiscal/service';
import { transitionOrder } from '../orders/service';
import { providerByName } from './provider';
import { refreshPaymentStatus } from './tenders';

type Refunder = (provider: string, reference: string, cents: number, key: string) => Promise<void>;

const providerRefund: Refunder = async (provider, reference, cents, key) => {
	const p = await providerByName(provider);
	if (!p) throw new DomainError('err.refund.provider', { vars: { provider } });
	await p.refund(reference, cents, key);
};

export interface RefundOutcome {
	refundedCents: number;
	cancelled: boolean;
	/** Set when the NFC-e could not be cancelled (outside the window, provider refused). */
	fiscalProblem: string | null;
}

export async function cancelAndRefund(
	orderId: string,
	reason: string,
	actor: Actor & { role: StaffRole },
	refunder: Refunder = providerRefund,
	fiscalCancel: typeof cancelFiscal = cancelFiscal
): Promise<RefundOutcome> {
	if (actor.role !== 'admin')
		throw new DomainError('err.tender.refundAdmin', { code: 'forbidden', status: 403 });
	const why = reason.trim();
	if (why.length < 15) throw new DomainError('err.fiscal.justification');
	const [order] = await db()<
		{ status: OrderStatus }[]
	>`select status from orders where id = ${orderId}`;
	if (!order) throw new DomainError('err.tender.notFound', { code: 'not_found', status: 404 });
	const tenders = await db()<
		{
			id: string;
			provider: string;
			method: string;
			amount_cents: number;
			provider_reference: string | null;
		}[]
	>`select id, provider, method, amount_cents, provider_reference from tenders
		where order_id = ${orderId} and status = 'paid' order by created_at`;

	// Provider refunds happen outside our transaction; each is marked as soon as it succeeds, so
	// a retry after a failure only asks for what is still owed.
	let refunded = 0;
	for (const t of tenders.filter((x) => x.provider !== 'manual')) {
		if (!t.provider_reference) throw new DomainError('err.refund.noReference');
		await refunder(t.provider, t.provider_reference, t.amount_cents, `refund:${t.id}`);
		await db()`update tenders set status = 'refunded', refunded_at = now(), refund_reason = ${why}
			where id = ${t.id} and status = 'paid'`;
		refunded += t.amount_cents;
	}

	const cancelled = await db().begin(async (tx) => {
		for (const t of tenders.filter((x) => x.provider === 'manual')) {
			const [u] = await tx<{ id: string }[]>`
				update tenders set status = 'refunded', refunded_at = now(), refund_reason = ${why}
				where id = ${t.id} and status = 'paid' returning id`;
			if (!u) continue;
			if (t.method === 'cash') await recordCashRefund(tx, t.id, t.amount_cents, actor);
			refunded += t.amount_cents;
		}
		await refreshPaymentStatus(tx, orderId);
		// A delivered order stays completed (the food was eaten); anything open is cancelled, which
		// returns stock or books it as waste.
		let didCancel = false;
		if (!TERMINAL_STATUSES.includes(order.status)) {
			await transitionOrder({ orderId, to: 'cancelled', actor, reason: why }, tx);
			didCancel = true;
		}
		await audit(tx, actor, 'order.cancel_refund', 'order', orderId, {
			refundedCents: refunded,
			reason: why
		});
		return didCancel;
	});

	let fiscalProblem: string | null = null;
	const [note] =
		await db()`select 1 from fiscal_documents where order_id = ${orderId} and status = 'authorized'`;
	if (note) {
		try {
			await fiscalCancel(orderId, why, actor);
		} catch (e) {
			fiscalProblem = e instanceof Error ? e.message : String(e);
		}
	}
	return { refundedCents: refunded, cancelled, fiscalProblem };
}
