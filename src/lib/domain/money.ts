const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formats integer centavos as BRL, e.g. 2590 -> "R$ 25,90". */
export function formatBRL(cents: number): string {
	return brl.format(cents / 100);
}

/** Parses a user-typed BRL amount ("25,90", "25.90", "R$ 25") into centavos. */
export function parseBRL(input: string): number | null {
	const cleaned = input.replace(/[R$\s]/g, '');
	if (!cleaned) return null;
	const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
	if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
	return Math.round(Number(normalized) * 100);
}
