import { describe, expect, it } from 'vitest';
import { DEFAULT_TERMS, feeCents, findTerm, mergeTerms } from './payment-fees';

describe('payment fees', () => {
	it('uses the shop rows over the defaults', () => {
		const terms = mergeTerms([
			{ method: 'terminal_card', provider: 'manual', feeBps: 150, feeFixedCents: 0, settleDays: 1 }
		]);
		expect(findTerm(terms, 'terminal_card', 'manual')?.feeBps).toBe(150);
		expect(terms).toHaveLength(DEFAULT_TERMS.length);
	});

	it('computes the fee, half to even', () => {
		const efi = findTerm(DEFAULT_TERMS, 'pix', 'efi');
		// 1.19% of R$45,00 = R$0,5355 → R$0,54.
		expect(feeCents(efi, 4500)).toBe(54);
		expect(feeCents(findTerm(DEFAULT_TERMS, 'ifood_collected', 'ifood'), 4500)).toBe(144);
		expect(feeCents({ ...efi!, feeBps: 100, feeFixedCents: 0 }, 50)).toBe(0);
		expect(feeCents({ ...efi!, feeBps: 100, feeFixedCents: 0 }, 150)).toBe(2);
		expect(feeCents(findTerm(DEFAULT_TERMS, 'cash', 'manual'), 4500)).toBe(0);
		expect(feeCents(null, 4500)).toBe(0);
	});
});
