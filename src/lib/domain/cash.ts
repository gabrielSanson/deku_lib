// The cash drawer's arithmetic. Movements are signed: money in is positive.

export type CashMovementKind = 'sale' | 'refund' | 'sangria' | 'suprimento';

export interface CashMovementAmount {
	kind: CashMovementKind;
	amountCents: number;
}

export interface CashBalance {
	openingFloatCents: number;
	salesCents: number;
	refundsCents: number;
	sangriaCents: number;
	suprimentoCents: number;
	/** What should be in the drawer now. */
	expectedCents: number;
}

export function cashBalance(
	openingFloatCents: number,
	movements: CashMovementAmount[]
): CashBalance {
	const sum = (kind: CashMovementKind) =>
		movements.filter((m) => m.kind === kind).reduce((n, m) => n + m.amountCents, 0);
	const salesCents = sum('sale');
	const refundsCents = sum('refund');
	const sangriaCents = sum('sangria');
	const suprimentoCents = sum('suprimento');
	return {
		openingFloatCents,
		salesCents,
		refundsCents,
		sangriaCents,
		suprimentoCents,
		expectedCents: openingFloatCents + salesCents + refundsCents + sangriaCents + suprimentoCents
	};
}

/** Counted minus expected: positive means extra cash, negative means cash is missing. */
export function cashDifference(countedCents: number, expectedCents: number): number {
	return countedCents - expectedCents;
}
