import { describe, expect, it } from 'vitest';
import { orderRequestHash, stableJson } from './request-hash';

const base = {
	channel: 'web',
	sourceMode: 'site',
	lines: [{ sku: 'BRG-CLASSICO', quantity: 1, options: [] }],
	fulfillmentType: 'pickup',
	customer: { phoneE164: '+5511999990000', email: 'Ana@Example.com' }
};

describe('stableJson', () => {
	it('sorts keys and drops undefined values', () => {
		expect(stableJson({ b: 1, a: { d: undefined, c: [2, undefined] } })).toBe(
			'{"a":{"c":[2,null]},"b":1}'
		);
	});
});

describe('orderRequestHash', () => {
	it('gives the same hash for the same request whatever the key order or e-mail case', () => {
		const again = {
			fulfillmentType: 'pickup',
			customer: { email: 'ana@example.com ', phoneE164: '+5511999990000' },
			lines: [{ options: [], quantity: 1, sku: 'BRG-CLASSICO' }],
			sourceMode: 'site',
			channel: 'web'
		};
		expect(orderRequestHash(again)).toBe(orderRequestHash(base));
	});

	it('changes when the cart, fulfillment, address or coupon changes', () => {
		const h = orderRequestHash(base);
		expect(
			orderRequestHash({ ...base, lines: [{ sku: 'BRG-CLASSICO', quantity: 2, options: [] }] })
		).not.toBe(h);
		expect(orderRequestHash({ ...base, fulfillmentType: 'delivery' })).not.toBe(h);
		expect(orderRequestHash({ ...base, address: { cep: '01001000' } })).not.toBe(h);
		expect(orderRequestHash({ ...base, couponCode: 'BEMVINDO' })).not.toBe(h);
	});
});
