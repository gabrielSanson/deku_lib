import { describe, expect, it } from 'vitest';
import { formatBRL, parseBRL } from './money';

describe('money', () => {
	it('formats centavos as BRL', () => {
		expect(formatBRL(2590).replace(/\s/g, ' ')).toBe('R$ 25,90');
	});
	it('parses typed amounts', () => {
		expect(parseBRL('25,90')).toBe(2590);
		expect(parseBRL('R$ 1.234,50')).toBe(123450);
		expect(parseBRL('40')).toBe(4000);
		expect(parseBRL('12.5')).toBe(1250);
		expect(parseBRL('abc')).toBeNull();
		expect(parseBRL('')).toBeNull();
	});
});
