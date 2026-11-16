import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mapOdOrder, odMeaning, odOutboundAction, type OdOrder } from './mapping';

const order = JSON.parse(readFileSync('tests/fixtures/opendelivery/order.json', 'utf8')) as OdOrder;

describe('Open Delivery mapping', () => {
	it('turns an order into ours, priced by the partner', () => {
		const m = mapOdOrder(order, '99food', (code) =>
			code === 'BRG-CLASSICO' ? { sku: code, categoryName: 'Lanches', prepStation: 'grill' } : null
		);
		expect(m).toMatchObject({
			channelOrderId: 'od-0001',
			displayId: '9K21',
			deliveryFeeCents: 600,
			channelTotalCents: 4290,
			fulfillmentType: 'delivery',
			fulfillmentProvider: 'partner_courier',
			customerLabel: 'João Teste · 99Food 9K21',
			paymentStatus: 'paid',
			unmappedCodes: []
		});
		expect(m.cart.lines[0]).toMatchObject({ unitPriceCents: 3290, modifiersUnitCents: 400 });
		expect(m.cart.subtotalCents + m.deliveryFeeCents - m.discountCents).toBe(4290);
		expect(m.address?.cep).toBe('01001000');
	});

	it('reads events and picks the outbound call', () => {
		expect(odMeaning('CREATED')).toEqual({ kind: 'placed' });
		expect(odMeaning('CANCELLED')).toEqual({ kind: 'status', to: 'cancelled' });
		expect(odMeaning('CANCELLATION_REQUEST_DENIED')).toEqual({ kind: 'cancelDenied' });
		expect(odMeaning('PICKUP_AREA_ASSIGNED')).toEqual({ kind: 'ignore' });
		expect(odOutboundAction('ready', { type: 'delivery', provider: 'own_driver' })).toBe(
			'dispatch'
		);
		expect(odOutboundAction('ready', { type: 'delivery', provider: 'partner_courier' })).toBe(
			'readyForPickup'
		);
		expect(odOutboundAction('preparing', { type: 'pickup', provider: 'shop' })).toBeNull();
	});
});
