import { describe, expect, it } from 'vitest';
import { fromShopInput, toShopInput } from './time';

describe('shop-time inputs', () => {
	it('reads a local datetime in São Paulo time', () => {
		expect(fromShopInput('2026-10-21T18:00')?.toISOString()).toBe('2026-10-21T21:00:00.000Z');
		expect(fromShopInput('nope')).toBeNull();
	});
	it('round-trips', () => {
		expect(toShopInput(fromShopInput('2026-01-02T00:30'))).toBe('2026-01-02T00:30');
	});
});
