import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mapIfoodOrder, outboundAction, statusForEvent, type IfoodOrder } from './mapping';

const fixture = JSON.parse(
	readFileSync('tests/fixtures/ifood/order-delivery.json', 'utf8')
) as IfoodOrder;
const known = new Set(['BRG-CLASSICO', 'ACP-FRITAS']);
const lookup = (code: string) =>
	known.has(code) ? { sku: code, categoryName: 'Lanches', prepStation: 'grill' } : null;

describe('mapIfoodOrder', () => {
	const m = mapIfoodOrder(fixture, lookup);

	it('converts reais to centavos and keeps line totals consistent', () => {
		expect(m.cart.lines[0]).toMatchObject({
			productSku: 'BRG-CLASSICO',
			quantity: 2,
			unitPriceCents: 2890,
			modifiersUnitCents: 400,
			lineTotalCents: 6580
		});
		for (const l of m.cart.lines)
			expect(l.lineTotalCents).toBe(l.quantity * (l.unitPriceCents + l.modifiersUnitCents));
		expect(m.cart.subtotalCents).toBe(8570);
	});

	it('maps fees, discount and total to match iFood', () => {
		expect(m.deliveryFeeCents).toBe(799 + 99);
		expect(m.discountCents).toBe(1000);
		expect(m.cart.subtotalCents - m.discountCents + m.deliveryFeeCents).toBe(m.channelTotalCents);
	});

	it('keeps unknown items instead of dropping them', () => {
		expect(m.unmappedCodes).toEqual(['IFOOD-ONLY']);
		expect(m.cart.lines[2].productSku).toBe('IFOOD:IFOOD-ONLY');
	});

	it('reads fulfillment, payment, address and allergy flags', () => {
		expect(m.fulfillmentType).toBe('delivery');
		expect(m.fulfillmentProvider).toBe('ifood_courier');
		expect(m.paymentStatus).toBe('paid');
		expect(m.isTest).toBe(true);
		expect(m.displayId).toBe('7F3A');
		expect(m.address).toMatchObject({
			cep: '01304000',
			street: 'Rua Augusta',
			number: '100',
			instructions: 'Portão azul'
		});
		expect(m.cart.lines[0].allergyFlag).toBe(true);
	});

	it('leaves cash-on-delivery orders unpaid', () => {
		const cod = mapIfoodOrder({ ...fixture, payments: { prepaid: 0, pending: 84.68 } }, lookup);
		expect(cod.paymentStatus).toBe('pending');
	});

	it('maps takeout to pickup', () => {
		const t = mapIfoodOrder({ ...fixture, orderType: 'TAKEOUT', delivery: undefined }, lookup);
		expect(t.fulfillmentType).toBe('pickup');
		expect(t.address).toBeUndefined();
	});
});

describe('event and action mapping', () => {
	it('maps inbound codes to statuses', () => {
		expect(statusForEvent('CFM')).toBe('confirmed');
		expect(statusForEvent('DSP')).toBe('ready');
		expect(statusForEvent('CON')).toBe('completed');
		expect(statusForEvent('CAN')).toBe('cancelled');
		expect(statusForEvent('XYZ')).toBeNull();
	});

	it('maps our changes to iFood actions', () => {
		const ifoodCourier = { type: 'delivery', provider: 'ifood_courier' };
		expect(outboundAction('confirmed', ifoodCourier)).toBe('confirm');
		expect(outboundAction('ready', ifoodCourier)).toBe('readyToPickup');
		expect(outboundAction('ready', { type: 'delivery', provider: 'own_driver' })).toBe('dispatch');
		expect(outboundAction('rejected', ifoodCourier)).toBe('requestCancellation');
		expect(outboundAction('completed', ifoodCourier)).toBeNull();
	});
});
