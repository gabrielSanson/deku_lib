import { describe, expect, it } from 'vitest';
import { contrastFailures, contrastRatio } from './contrast';

describe('brand contrast', () => {
	it('computes WCAG ratios', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
		expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
		expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
	});
	it('passes the built-in Deku colours', () => {
		expect(
			contrastFailures({ primary: '#ffbc00', dark: '#0b0b0b', background: '#faf7f0' })
		).toEqual([]);
	});
	it('names each pair that fails', () => {
		const fails = contrastFailures({ primary: '#b00020', dark: '#7a7a7a', background: '#3a3a3a' });
		expect(fails.map((f) => f.id)).toEqual([
			'onPrimary',
			'onDark',
			'primaryOnDark',
			'inkOnBackground',
			'mutedOnBackground'
		]);
		expect(fails[0].ratio).toBeLessThan(4.5);
	});
});
