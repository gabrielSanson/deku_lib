import { describe, expect, it } from 'vitest';
import { mayMarket, sourceForChannel } from './consent';

const yes = new Date('2026-01-01');

describe('mayMarket', () => {
	it('allows own-channel contacts who consented and did not opt out', () => {
		expect(mayMarket({ source: 'own', marketingConsentAt: yes, marketingOptOutAt: null })).toBe(
			true
		);
		expect(
			mayMarket({ source: 'whatsapp', marketingConsentAt: yes, marketingOptOutAt: null })
		).toBe(true);
	});

	it('never allows delivery-app contacts, even with consent', () => {
		expect(mayMarket({ source: 'ifood', marketingConsentAt: yes, marketingOptOutAt: null })).toBe(
			false
		);
		expect(
			mayMarket({ source: 'opendelivery', marketingConsentAt: yes, marketingOptOutAt: null })
		).toBe(false);
	});

	it('refuses without consent, after opt-out or once deleted', () => {
		expect(mayMarket({ source: 'own', marketingConsentAt: null, marketingOptOutAt: null })).toBe(
			false
		);
		expect(mayMarket({ source: 'own', marketingConsentAt: yes, marketingOptOutAt: yes })).toBe(
			false
		);
		expect(
			mayMarket({ source: 'own', marketingConsentAt: yes, marketingOptOutAt: null, deletedAt: yes })
		).toBe(false);
	});

	it('names the source of an order channel', () => {
		expect(sourceForChannel('web')).toBe('own');
		expect(sourceForChannel('counter', 'staff_pos')).toBe('pos');
		expect(sourceForChannel('ifood')).toBe('ifood');
		expect(sourceForChannel('opendelivery')).toBe('opendelivery');
	});
});
