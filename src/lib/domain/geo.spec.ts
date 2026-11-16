import { describe, expect, it } from 'vitest';
import { distanceMeters, parseRadiusKm } from './geo';

describe('distanceMeters', () => {
	it('is zero for the same point', () => {
		expect(distanceMeters({ lat: -23.56, lng: -46.65 }, { lat: -23.56, lng: -46.65 })).toBe(0);
	});
	it('matches a known distance (Praça da Sé to MASP, about 2.6 km)', () => {
		const d = distanceMeters({ lat: -23.5503, lng: -46.6339 }, { lat: -23.5614, lng: -46.6559 });
		expect(d).toBeGreaterThan(2400);
		expect(d).toBeLessThan(2700);
	});
	it('one degree of latitude is about 111 km', () => {
		const d = distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
		expect(Math.abs(d - 111_195)).toBeLessThan(50);
	});
	it('is symmetric', () => {
		const a = { lat: -22.9, lng: -43.2 };
		const b = { lat: -23.5, lng: -46.6 };
		expect(distanceMeters(a, b)).toBe(distanceMeters(b, a));
	});
});

describe('parseRadiusKm', () => {
	it('reads comma or dot decimals', () => {
		expect(parseRadiusKm('2,5')).toBe(2500);
		expect(parseRadiusKm('3')).toBe(3000);
		expect(parseRadiusKm('0.1')).toBe(100);
	});
	it('refuses empty or out-of-range values', () => {
		expect(parseRadiusKm('')).toBeNull();
		expect(parseRadiusKm('0')).toBeNull();
		expect(parseRadiusKm('101')).toBeNull();
		expect(parseRadiusKm('abc')).toBeNull();
	});
});
