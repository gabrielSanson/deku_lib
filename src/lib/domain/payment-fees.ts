// What each way of being paid costs the shop. These defaults apply until the owner edits them in
// Configurações → Pagamentos → Taxas. Provider prices marked [UNVERIFIED] are TODO(verify).
import { roundHalfEven } from './recipe';

export interface PaymentTerm {
	method: string;
	provider: string;
	feeBps: number;
	feeFixedCents: number;
	settleDays: number;
}

export const DEFAULT_TERMS: PaymentTerm[] = [
	{ method: 'cash', provider: 'manual', feeBps: 0, feeFixedCents: 0, settleDays: 0 },
	{ method: 'external_pix', provider: 'manual', feeBps: 0, feeFixedCents: 0, settleDays: 0 },
	// Card machine: credit rate by default; the owner sets their own (debit is usually ~150 bps).
	{ method: 'terminal_card', provider: 'manual', feeBps: 300, feeFixedCents: 0, settleDays: 30 },
	{ method: 'softpos_nfc', provider: 'manual', feeBps: 300, feeFixedCents: 0, settleDays: 30 },
	// [UNVERIFIED] Mercado Pago and Efí prices.
	{ method: 'pix', provider: 'mercadopago', feeBps: 99, feeFixedCents: 0, settleDays: 0 },
	{ method: 'online_card', provider: 'mercadopago', feeBps: 498, feeFixedCents: 0, settleDays: 30 },
	{ method: 'pix', provider: 'efi', feeBps: 119, feeFixedCents: 0, settleDays: 0 },
	// [UNVERIFIED] iFood's online payment fee, from the requirements doc.
	{ method: 'ifood_collected', provider: 'ifood', feeBps: 320, feeFixedCents: 0, settleDays: 30 }
];

/** The shop's terms: its own rows over the defaults. */
export function mergeTerms(own: PaymentTerm[]): PaymentTerm[] {
	const key = (t: PaymentTerm) => `${t.method}:${t.provider}`;
	const map = new Map(DEFAULT_TERMS.map((t) => [key(t), t]));
	for (const t of own) map.set(key(t), t);
	return [...map.values()];
}

export function findTerm(terms: PaymentTerm[], method: string, provider: string) {
	return (
		terms.find((t) => t.method === method && t.provider === provider) ??
		// A manual record of an online method (or a test provider) has no fee of its own.
		terms.find((t) => t.method === method && t.provider === 'manual') ??
		null
	);
}

/** The fee for an amount, rounded half to even. */
export function feeCents(term: PaymentTerm | null, amountCents: number): number {
	if (!term) return 0;
	return roundHalfEven((amountCents * term.feeBps) / 10_000) + term.feeFixedCents;
}
