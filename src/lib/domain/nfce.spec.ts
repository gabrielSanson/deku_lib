import { describe, expect, it } from 'vitest';
import { nfceLines, nfcePaymentCode, spread } from './nfce';

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
