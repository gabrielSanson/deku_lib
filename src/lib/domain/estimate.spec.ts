import { describe, expect, it } from 'vitest';
import { estimateMinutes } from './estimate';

describe('estimateMinutes', () => {
	it('is the prep time when the kitchen is empty', () => {
		expect(
			estimateMinutes({
				prepMinutes: 25,
				openKitchenOrders: 0,
				perOrderMinutes: 2,
				deliveryMinutes: 0
			})
		).toBe(25);
	});
	it('adds minutes per open order and the trip', () => {
		expect(
			estimateMinutes({
				prepMinutes: 25,
				openKitchenOrders: 6,
				perOrderMinutes: 2,
				deliveryMinutes: 20
			})
		).toBe(57);
	});
	it('ignores negative or missing values', () => {
		expect(
			estimateMinutes({
				prepMinutes: 20,
				openKitchenOrders: -3,
				perOrderMinutes: NaN,
				deliveryMinutes: -5
			})
		).toBe(20);
	});
	it('rounds fractional per-order minutes', () => {
		expect(
			estimateMinutes({
				prepMinutes: 20,
				openKitchenOrders: 3,
				perOrderMinutes: 1.5,
				deliveryMinutes: 0
			})
		).toBe(25);
	});
});
