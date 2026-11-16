import { describe, expect, it } from 'vitest';
import { buildDre, monthStart } from './dre';

describe('monthly result', () => {
	it('goes from gross sales to the result', () => {
		const d = buildDre({
			grossCents: 100_000,
			discountCents: 5_000,
			simplesRateBps: 600,
			foodCostCents: 30_000,
			commissionsCents: 6_000,
			paymentFeesCents: 1_000,
			deliveryCostCents: 2_000,
			expenses: { ocupacao: 20_000, pessoal: 15_000 }
		});
		const line = (k: string) => d.lines.find((l) => l.key === k)!.cents;
		// 95 000 × 6% = 5 700 tax.
		expect(line('taxes')).toBe(-5_700);
		expect(line('netRevenue')).toBe(89_300);
		expect(line('grossProfit')).toBe(59_300);
		expect(d.resultCents).toBe(59_300 - 9_000 - 35_000);
		expect(line('result')).toBe(d.resultCents);
		expect(line('exp.marketing')).toBe(0);
	});

	it('finds the first day of the month', () => {
		expect(monthStart('2026-11-16')).toBe('2026-11-01');
	});
});
