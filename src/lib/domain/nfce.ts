// Turns an order into NFC-e lines and payments. The order discount is spread over
// the lines in proportion to their value and the delivery fee rides as "outras
// despesas", so the note's total always equals the order's total.

export interface NfceSourceLine {
	sku: string;
	name: string;
	quantity: number;
	/** Charged value of the line before the order discount (unit + options, times quantity). */
	lineTotalCents: number;
	ncm: string | null;
}

export interface NfceLine {
	sku: string;
	name: string;
	quantity: number;
	grossCents: number;
	discountCents: number;
	otherCents: number;
	ncm: string | null;
}

/** Spreads `amount` over `weights` in proportion, giving rounding leftovers to the largest. */
export function spread(amount: number, weights: number[]): number[] {
	const total = weights.reduce((n, w) => n + w, 0);
	if (amount === 0 || total === 0) return weights.map(() => 0);
	const shares = weights.map((w) => Math.floor((amount * w) / total));
	let left = amount - shares.reduce((n, s) => n + s, 0);
	const order = weights.map((w, i) => [w, i] as const).sort((a, b) => b[0] - a[0]);
	for (let k = 0; left > 0; k = (k + 1) % order.length, left--) shares[order[k][1]]++;
	return shares;
}

export function nfceLines(
	lines: NfceSourceLine[],
	discountCents: number,
	deliveryFeeCents: number
): NfceLine[] {
	const gross = lines.map((l) => l.lineTotalCents);
	const discounts = spread(
		Math.min(
			discountCents,
			gross.reduce((n, g) => n + g, 0)
		),
		gross
	);
	const others = spread(deliveryFeeCents, gross);
	return lines.map((l, i) => ({
		sku: l.sku,
		name: l.name,
		quantity: l.quantity,
		grossCents: l.lineTotalCents,
		discountCents: discounts[i],
		otherCents: others[i],
		ncm: l.ncm
	}));
}

/** SEFAZ payment codes (tPag). */
export function nfcePaymentCode(method: string): string {
	switch (method) {
		case 'cash':
			return '01';
		case 'online_card':
			return '03';
		case 'terminal_card':
		case 'softpos_nfc':
			// The terminal does not tell credit from debit; 99 with a description is accepted.
			return '99';
		case 'pix':
		case 'external_pix':
			return '17';
		default:
			return '99';
	}
}

export const cents = (n: number) => (n / 100).toFixed(2);
