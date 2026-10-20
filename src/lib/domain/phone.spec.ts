import { describe, expect, it } from 'vitest';
import { normalizeBrPhone } from './phone.ts';

describe('normalizeBrPhone', () => {
	it('accepts common formats', () => {
		expect(normalizeBrPhone('(11) 98765-4321')).toBe('+5511987654321');
		expect(normalizeBrPhone('+55 11 98765 4321')).toBe('+5511987654321');
		expect(normalizeBrPhone('011 3456-7890')).toBe('+551134567890');
	});
	it('rejects invalid numbers', () => {
		expect(normalizeBrPhone('12345')).toBeNull();
		expect(normalizeBrPhone('(11) 88765-4321')).toBeNull();
	});
});
