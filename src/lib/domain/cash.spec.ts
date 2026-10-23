import { describe, expect, it } from 'vitest';
import { cashBalance, cashDifference } from './cash';

describe('cashBalance', () => {
	it('adds the float and every signed movement', () => {
		const b = cashBalance(10000, [
			{ kind: 'sale', amountCents: 3500 },
			{ kind: 'sale', amountCents: 2000 },
			{ kind: 'refund', amountCents: -2000 },
			{ kind: 'sangria', amountCents: -5000 },
			{ kind: 'suprimento', amountCents: 1500 }
		]);
		expect(b).toEqual({
			openingFloatCents: 10000,
			salesCents: 5500,
			refundsCents: -2000,
			sangriaCents: -5000,
			suprimentoCents: 1500,
			expectedCents: 10000
		});
	});

	it('is the float when nothing moved', () => {
		expect(cashBalance(5000, []).expectedCents).toBe(5000);
	});
});

describe('cashDifference', () => {
	it('is negative when cash is missing', () => {
		expect(cashDifference(9500, 10000)).toBe(-500);
		expect(cashDifference(10000, 10000)).toBe(0);
	});
});
