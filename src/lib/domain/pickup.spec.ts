import { describe, expect, it } from 'vitest';
import { getsReadyAlert, mayCall, pickupCode } from './pickup';

describe('pickup code', () => {
	it('is the full order number', () => {
		expect(pickupCode(1042)).toBe('1042');
		expect(pickupCode(10042)).toBe('10042');
	});

	it('can be called out only when the order is ready', () => {
		expect(mayCall('ready')).toBe(true);
		expect(mayCall('preparing')).toBe(false);
		expect(mayCall('completed')).toBe(false);
	});

	it('offers the ready alert to everyone who collects at the counter', () => {
		expect(getsReadyAlert('dine_in')).toBe(true);
		expect(getsReadyAlert('pickup')).toBe(true);
		expect(getsReadyAlert('counter')).toBe(true);
		expect(getsReadyAlert('delivery')).toBe(false);
	});
});
