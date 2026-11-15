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
	/** The product's own IBS/CBS codes; null uses the shop's defaults. */
	ibsCbsCst?: string | null;
	ibsCbsClass?: string | null;
}

export interface NfceLine {
	sku: string;
	name: string;
	quantity: number;
	grossCents: number;
	discountCents: number;
	otherCents: number;
	ncm: string | null;
	ibsCbsCst?: string | null;
	ibsCbsClass?: string | null;
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
		ncm: l.ncm,
		...(l.ibsCbsCst ? { ibsCbsCst: l.ibsCbsCst } : {}),
		...(l.ibsCbsClass ? { ibsCbsClass: l.ibsCbsClass } : {})
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

// ---------------------------------------------------------------------------
// Tax reform: IBS and CBS (NT 2025.002). Rates are percentages with up to four decimals,
// kept as strings ("0.9000") and turned into integers of 1/10000 percent, so no float ever
// touches money.
// ---------------------------------------------------------------------------

export interface IbsCbsRates {
	/** Percent strings with up to 4 decimals, e.g. "0.9000". */
	cbs: string;
	ibsUf: string;
	ibsMun: string;
}

export interface IbsCbsLine {
	cst: string;
	cls: string;
	baseCents: number;
	ibsUfCents: number;
	ibsMunCents: number;
	ibsCents: number;
	cbsCents: number;
}

export interface IbsCbsTotals {
	baseCents: number;
	ibsUfCents: number;
	ibsMunCents: number;
	ibsCents: number;
	cbsCents: number;
}

/** "0.9" / "0.9000" / "12" → units of 1/10000 percent (9000, 9000, 120000). */
export function rateUnits(rate: string): number {
	const m = String(rate)
		.trim()
		.match(/^(\d{1,3})(?:[.,](\d{0,4}))?$/);
	if (!m) throw new Error(`invalid IBS/CBS rate: ${rate}`);
	return Number(m[1]) * 10_000 + Number((m[2] ?? '').padEnd(4, '0'));
}

/** Units of 1/10000 percent back to the 4-decimal string Focus expects ("0.9000"). */
export function formatRate(units: number): string {
	return `${Math.floor(units / 10_000)}.${String(units % 10_000).padStart(4, '0')}`;
}

/** base × rate, rounded half to even, in integer arithmetic. */
export function taxCents(baseCents: number, units: number): number {
	const n = baseCents * units;
	const d = 1_000_000; // 100 (percent) × 10000 (rate units)
	const q = Math.floor(n / d);
	const r = n - q * d;
	if (r * 2 > d) return q + 1;
	if (r * 2 < d) return q;
	return q % 2 === 0 ? q : q + 1;
}

/**
 * The IBS/CBS values of one NFC-e line.
 * TODO(verify): base = gross − discount + other expenses (delivery fee). Confirm the base
 * composition with the SVRS validator (https://dfe-portal.svrs.rs.gov.br/Cff/ValidadorRtcNfe);
 * it lives only here so a correction is one line.
 */
export function ibsCbsLine(
	line: Pick<NfceLine, 'grossCents' | 'discountCents' | 'otherCents' | 'ibsCbsCst' | 'ibsCbsClass'>,
	rates: IbsCbsRates,
	cst: string,
	cls: string
): IbsCbsLine {
	const baseCents = line.grossCents - line.discountCents + line.otherCents;
	const ibsUfCents = taxCents(baseCents, rateUnits(rates.ibsUf));
	const ibsMunCents = taxCents(baseCents, rateUnits(rates.ibsMun));
	return {
		cst: line.ibsCbsCst || cst,
		cls: line.ibsCbsClass || cls,
		baseCents,
		ibsUfCents,
		ibsMunCents,
		ibsCents: ibsUfCents + ibsMunCents,
		cbsCents: taxCents(baseCents, rateUnits(rates.cbs))
	};
}

export function ibsCbsTotals(lines: IbsCbsLine[]): IbsCbsTotals {
	const sum = (k: keyof IbsCbsTotals) => lines.reduce((n, l) => n + l[k], 0);
	return {
		baseCents: sum('baseCents'),
		ibsUfCents: sum('ibsUfCents'),
		ibsMunCents: sum('ibsMunCents'),
		ibsCents: sum('ibsCents'),
		cbsCents: sum('cbsCents')
	};
}

/** The calendar year of an issue date in São Paulo, which picks the rate row. */
export function fiscalYear(at: Date): number {
	return Number(
		new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(at)
	);
}
