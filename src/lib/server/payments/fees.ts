// Fees per payment: the shop's terms (Configurações → Pagamentos → Taxas) and the fee stored on
// each tender when it is paid. TODO(verify): read Mercado Pago's fee_details when the provider
// reports it; until then every fee comes from the terms.
import {
	feeCents,
	findTerm,
	mergeTerms,
	type PaymentTerm,
	DEFAULT_TERMS
} from '#lib/domain/payment-fees.ts';
import { audit, type Actor } from '../audit';
import { db, type Db } from '../db';
import { DomainError } from '../errors';

export async function paymentTerms(sql: Db = db()): Promise<PaymentTerm[]> {
	const own = await sql<PaymentTerm[]>`
		select method, provider, fee_bps as "feeBps", fee_fixed_cents as "feeFixedCents",
			settle_days as "settleDays"
		from payment_method_terms`;
	return mergeTerms(own);
}

export async function savePaymentTerms(terms: PaymentTerm[], actor: Actor) {
	const known = new Set(DEFAULT_TERMS.map((t) => `${t.method}:${t.provider}`));
	for (const t of terms) {
		if (!known.has(`${t.method}:${t.provider}`)) throw new DomainError('err.fees.invalid');
		const ok = (n: number, max: number) => Number.isInteger(n) && n >= 0 && n <= max;
		if (!ok(t.feeBps, 5000) || !ok(t.feeFixedCents, 100_000) || !ok(t.settleDays, 365))
			throw new DomainError('err.fees.invalid');
	}
	await db().begin(async (tx) => {
		for (const t of terms)
			await tx`insert into payment_method_terms (method, provider, fee_bps, fee_fixed_cents, settle_days)
				values (${t.method}, ${t.provider}, ${t.feeBps}, ${t.feeFixedCents}, ${t.settleDays})
				on conflict (shop_id, method, provider) do update set fee_bps = excluded.fee_bps,
					fee_fixed_cents = excluded.fee_fixed_cents, settle_days = excluded.settle_days`;
		await audit(tx, actor, 'payments.terms_saved', 'payment_method_terms', '1', {
			count: terms.length
		});
	});
}

/** Sets a paid tender's fee once: the provider's figure when given, else the shop's terms. */
export async function setTenderFee(tx: Db, tenderId: string, providerFeeCents?: number | null) {
	const [t] = await tx<
		{ method: string; provider: string; amount_cents: number; fee_source: string | null }[]
	>`select method, provider, amount_cents, fee_source from tenders where id = ${tenderId}
		and status in ('paid', 'refunded')`;
	if (!t || t.fee_source) return;
	const fee =
		providerFeeCents != null
			? providerFeeCents
			: feeCents(findTerm(await paymentTerms(tx), t.method, t.provider), t.amount_cents);
	await tx`update tenders set fee_cents = ${fee},
		fee_source = ${providerFeeCents != null ? 'provider' : 'terms'} where id = ${tenderId}`;
}

/** Daily: paid tenders from before fees were recorded get theirs from the terms. */
export async function backfillTenderFees(limit = 500) {
	const sql = db();
	const rows = await sql<{ id: string }[]>`
		select id from tenders where fee_source is null and status in ('paid', 'refunded')
		order by created_at limit ${limit}`;
	for (const r of rows) await setTenderFee(sql, r.id);
	return rows.length;
}
