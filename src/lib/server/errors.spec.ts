import { describe, expect, it } from 'vitest';
import { PricingError } from '#lib/domain/pricing.ts';
import { DomainError } from './errors';

describe('DomainError', () => {
	it('keeps the catalog key and reads the default wording', () => {
		const err = new DomainError('err.menu.optionSkuTaken', {
			code: 'duplicate',
			vars: { sku: 'BAC-01' }
		});
		expect(err).toMatchObject({ key: 'err.menu.optionSkuTaken', code: 'duplicate', status: 400 });
		expect(err.message).toBe('O código BAC-01 já é usado por outro item.');
	});

	it('passes final words through as they are', () => {
		const err = new DomainError({ text: 'Fechado para inventário' }, { status: 409 });
		expect(err).toMatchObject({ key: null, message: 'Fechado para inventário', status: 409 });
	});
});

describe('PricingError', () => {
	it('names the message and the item', () => {
		const err = new PricingError('err.cart.soldOut', { vars: { name: 'Bacon' }, sku: 'BAC' });
		expect(err).toMatchObject({
			key: 'err.cart.soldOut',
			sku: 'BAC',
			message: 'Bacon está esgotado.'
		});
	});
});
