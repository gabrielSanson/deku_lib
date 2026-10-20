import { describe, expect, it } from 'vitest';
import { fulfillmentLabel } from './fulfillment';

describe('fulfillmentLabel', () => {
	it('names the table for dine-in orders', () => {
		expect(fulfillmentLabel('dine_in', '7')).toBe('Comer aqui · mesa 7');
		expect(fulfillmentLabel('dine_in', null)).toBe('Comer aqui');
		expect(fulfillmentLabel('pickup')).toBe('Para viagem');
	});
});
