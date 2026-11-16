import { describe, expect, it } from 'vitest';
import { billingPeriod, dueAt, invoiceReference, statusForUnpaid } from './billing';

const day = (d: string) => new Date(`${d}T12:00:00-03:00`);

describe('platform billing', () => {
	it('bills calendar months', () => {
		expect(billingPeriod('2027-01-01')).toEqual({ start: '2027-01-01', end: '2027-02-01' });
		expect(billingPeriod('2026-12-15')).toEqual({ start: '2026-12-01', end: '2027-01-01' });
	});

	it('is due on the 10th, end of day in São Paulo', () => {
		expect(dueAt('2027-01-01').toISOString()).toBe('2027-01-11T02:59:59.000Z');
	});

	it('warns after the grace days, suspends 14 days later, and reactivates when paid', () => {
		const due = dueAt('2027-01-01');
		expect(statusForUnpaid('active', due, 7, day('2027-01-15'))).toBe('active');
		expect(statusForUnpaid('active', due, 7, day('2027-01-18'))).toBe('past_due');
		expect(statusForUnpaid('past_due', due, 7, day('2027-02-01'))).toBe('suspended');
		expect(statusForUnpaid('suspended', null, 7, day('2027-02-02'))).toBe('active');
		expect(statusForUnpaid('trial', due, 7, day('2027-03-01'))).toBe('trial');
		expect(statusForUnpaid('closed', null, 7, day('2027-03-01'))).toBe('closed');
	});

	it('makes a 25-character Pix reference from the invoice id', () => {
		expect(invoiceReference('0b5f1c3e-1111-4222-8333-944455556666')).toBe(
			'0b5f1c3e11114222833394445'
		);
	});
});
