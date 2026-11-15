import { describe, expect, it } from 'vitest';
import { OrderKey } from './order-key';

function counter() {
	let n = 0;
	return () => `k${++n}`;
}

describe('OrderKey', () => {
	it('keeps the key across retries of the same request', () => {
		const k = new OrderKey(counter());
		const body = JSON.stringify({ lines: [{ sku: 'A', quantity: 1 }] });
		expect(k.for(body)).toBe('k1');
		expect(k.for(body)).toBe('k1');
	});

	it('makes a new key when the cart, fulfillment or address changes', () => {
		const k = new OrderKey(counter());
		expect(k.for('{"lines":[1]}')).toBe('k1');
		expect(k.for('{"lines":[1,2]}')).toBe('k2');
		expect(k.for('{"lines":[1,2],"fulfillmentType":"delivery"}')).toBe('k3');
		expect(k.for('{"lines":[1,2],"fulfillmentType":"delivery"}')).toBe('k3');
	});

	it('does not reuse an old key when the request changes back', () => {
		const k = new OrderKey(counter());
		k.for('a');
		k.for('b');
		expect(k.for('a')).toBe('k3');
	});

	it('starts over after reset', () => {
		const k = new OrderKey(counter());
		expect(k.for('a')).toBe('k1');
		k.reset();
		expect(k.for('a')).toBe('k2');
	});
});
