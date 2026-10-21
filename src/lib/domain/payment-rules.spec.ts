import { describe, expect, it } from 'vitest';
import { confirmsOnPayment, mayConfirm, waitsForPayment, webPaymentPlan } from './payment-rules';

describe('payment rules', () => {
	it('maps every site payment method to a paid-up-front plan', () => {
		expect(webPaymentPlan('pix')).toBe('online');
		expect(webPaymentPlan('online_card')).toBe('online');
		expect(webPaymentPlan('pix_key')).toBe('pix_key');
	});

	it('keeps site and counter orders out of the kitchen until paid', () => {
		expect(waitsForPayment('online')).toBe(true);
		expect(waitsForPayment('pix_key')).toBe(true);
		expect(waitsForPayment('counter')).toBe(true);
		expect(waitsForPayment('channel')).toBe(false);
	});

	it('confirms a waiting order once it is fully paid, and only then', () => {
		expect(confirmsOnPayment('counter', 'new', 'paid')).toBe(true);
		expect(confirmsOnPayment('pix_key', 'new', 'paid')).toBe(true);
		expect(confirmsOnPayment('counter', 'new', 'pending')).toBe(false);
		expect(confirmsOnPayment('counter', 'confirmed', 'paid')).toBe(false);
		expect(confirmsOnPayment('counter', 'cancelled', 'paid')).toBe(false);
		expect(confirmsOnPayment('channel', 'new', 'paid')).toBe(false);
	});

	it('does not let staff send an unpaid order to the kitchen', () => {
		expect(mayConfirm('counter', 'pending')).toBe(false);
		expect(mayConfirm('pix_key', 'pending')).toBe(false);
		expect(mayConfirm('pix_key', 'paid')).toBe(true);
		expect(mayConfirm('channel', 'pending')).toBe(true);
		// Orders placed before the rule could still be paid on pickup.
		expect(mayConfirm('on_fulfillment', 'pending')).toBe(true);
	});
});
