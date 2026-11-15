import { describe, expect, it } from 'vitest';
import {
	fiscalYear,
	formatRate,
	ibsCbsLine,
	ibsCbsTotals,
	nfceLines,
	nfcePaymentCode,
	rateUnits,
	spread,
	taxCents
} from './nfce';

describe('spread', () => {
	it('keeps the total exact', () => {
		const s = spread(100, [3000, 1500, 1500]);
		expect(s.reduce((n, x) => n + x, 0)).toBe(100);
		expect(s).toEqual([50, 25, 25]);
		expect(spread(7, [1, 1, 1]).reduce((n, x) => n + x, 0)).toBe(7);
		expect(spread(0, [5, 5])).toEqual([0, 0]);
	});
});

describe('nfceLines', () => {
	it('spreads discount and delivery fee so the note matches the order', () => {
		const lines = nfceLines(
			[
				{ sku: 'A', name: 'Bacon', quantity: 2, lineTotalCents: 7380, ncm: null },
				{ sku: 'B', name: 'Fritas', quantity: 1, lineTotalCents: 1410, ncm: '20052000' }
			],
			900,
			900
		);
		const total = lines.reduce((n, l) => n + l.grossCents - l.discountCents + l.otherCents, 0);
		expect(total).toBe(7380 + 1410 - 900 + 900);
		expect(lines[1].ncm).toBe('20052000');
	});
});

describe('nfcePaymentCode', () => {
	it('maps the shop methods', () => {
		expect(nfcePaymentCode('cash')).toBe('01');
		expect(nfcePaymentCode('external_pix')).toBe('17');
		expect(nfcePaymentCode('terminal_card')).toBe('99');
	});
});

describe('IBS/CBS', () => {
	const rates2026 = { cbs: '0.9000', ibsUf: '0.1000', ibsMun: '0.0000' };

	it('reads and writes rates without floats', () => {
		expect(rateUnits('0.9000')).toBe(9000);
		expect(rateUnits('0.9')).toBe(9000);
		expect(rateUnits('0,05')).toBe(500);
		expect(rateUnits('12')).toBe(120000);
		expect(formatRate(9000)).toBe('0.9000');
		expect(formatRate(500)).toBe('0.0500');
		expect(formatRate(120000)).toBe('12.0000');
		expect(() => rateUnits('abc')).toThrow();
	});

	it('rounds half to even', () => {
		// 50 cents × 1% = 0.5 cent → 0 (even); 150 × 1% = 1.5 → 2; 250 × 1% = 2.5 → 2.
		expect(taxCents(50, 10000)).toBe(0);
		expect(taxCents(150, 10000)).toBe(2);
		expect(taxCents(250, 10000)).toBe(2);
		expect(taxCents(251, 10000)).toBe(3);
		// R$ 45,50 × 0.9% = 40.95 cents → 41.
		expect(taxCents(4550, 9000)).toBe(41);
	});

	it('uses gross − discount + delivery as the base and the product codes over the defaults', () => {
		const l = ibsCbsLine(
			{
				grossCents: 3000,
				discountCents: 300,
				otherCents: 333,
				ibsCbsCst: '200',
				ibsCbsClass: null
			},
			rates2026,
			'000',
			'000001'
		);
		expect(l).toEqual({
			cst: '200',
			cls: '000001',
			baseCents: 3033,
			ibsUfCents: 3,
			ibsMunCents: 0,
			ibsCents: 3,
			cbsCents: 27
		});
	});

	it('R$ 45 order with R$ 5 delivery and R$ 4,50 off: lines add up to the totals', () => {
		const lines = nfceLines(
			[
				{ sku: 'A', name: 'Clássico', quantity: 1, lineTotalCents: 3000, ncm: null },
				{ sku: 'B', name: 'Fritas', quantity: 1, lineTotalCents: 1500, ncm: null }
			],
			450,
			500
		);
		const tax = lines.map((l) => ibsCbsLine(l, rates2026, '000', '000001'));
		const totals = ibsCbsTotals(tax);
		expect(totals.baseCents).toBe(4500 - 450 + 500);
		expect(totals.cbsCents).toBe(tax.reduce((n, t) => n + t.cbsCents, 0));
		expect(totals.ibsCents).toBe(totals.ibsUfCents + totals.ibsMunCents);
		expect(totals).toEqual({
			baseCents: 4550,
			ibsUfCents: 5,
			ibsMunCents: 0,
			ibsCents: 5,
			cbsCents: 41
		});
	});

	it('picks the rate year in São Paulo time', () => {
		expect(fiscalYear(new Date('2027-01-01T02:59:00Z'))).toBe(2026);
		expect(fiscalYear(new Date('2027-01-01T03:00:00Z'))).toBe(2027);
	});
});
