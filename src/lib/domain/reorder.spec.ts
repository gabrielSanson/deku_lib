import { describe, expect, it } from 'vitest';
import { fixtureCatalog } from '#lib/server/catalog/fixture.ts';
import { REMOVE_GROUP } from './catalog';
import { priceCart } from './pricing';
import { rebuildOrder, type PastItem } from './reorder';

const products = fixtureCatalog.products;
const none = new Set<string>();

const classico: PastItem = {
	sku: 'BRG-CLASSICO',
	name: 'Clássico',
	quantity: 2,
	note: 'bem quente',
	modifiers: [
		{ groupName: 'Ponto da carne', optionSku: 'PONTO-AO', optionName: 'Ao ponto', quantity: 1 },
		{ groupName: 'Adicionais', optionSku: 'ADD-BACON', optionName: 'Bacon', quantity: 1 },
		{ groupName: 'Retirar', optionSku: null, optionName: 'Sem picles', quantity: 1 }
	]
};

describe('rebuildOrder', () => {
	it('rebuilds choices, removals and notes at today’s prices', () => {
		const { lines, skipped } = rebuildOrder([classico], products, none, none);
		expect(skipped).toEqual([]);
		expect(lines).toHaveLength(1);
		expect(lines[0]).toMatchObject({ quantity: 2, note: 'bem quente' });
		expect(lines[0].options).toEqual([
			{ groupId: 'ponto', sku: 'PONTO-AO', name: 'Ao ponto', priceCents: 0, quantity: 1 },
			{ groupId: 'adicionais', sku: 'ADD-BACON', name: 'Bacon', priceCents: 500, quantity: 1 },
			{ groupId: REMOVE_GROUP, sku: 'picles', name: 'Sem picles', priceCents: 0, quantity: 1 }
		]);
		// The rebuilt line is a valid cart for the server's pricing.
		const priced = priceCart(
			fixtureCatalog,
			lines.map((l) => ({ sku: l.product.sku, quantity: l.quantity, options: l.options })),
			{ channel: 'web', soldOut: none }
		);
		expect(priced.subtotalCents).toBe(2 * (2890 + 500));
	});

	it('leaves out what is gone, sold out or no longer matches the menu', () => {
		const gone: PastItem = { ...classico, sku: 'BRG-ANTIGO', name: 'Antigo', modifiers: [] };
		const oldOption: PastItem = {
			...classico,
			modifiers: [{ groupName: 'Ponto', optionSku: 'PONTO-X', optionName: 'X', quantity: 1 }]
		};
		const noChoice: PastItem = { ...classico, modifiers: [] };
		const result = rebuildOrder([gone, oldOption, noChoice], products, none, none);
		expect(result.lines).toEqual([]);
		expect(result.skipped).toEqual(['Antigo', 'Clássico', 'Clássico']);

		expect(rebuildOrder([classico], products, new Set(['BRG-CLASSICO']), none).skipped).toEqual([
			'Clássico'
		]);
		expect(rebuildOrder([classico], products, new Set(['ADD-BACON']), none).skipped).toEqual([
			'Clássico'
		]);
	});

	it('skips a dish whose ingredient ran out unless the customer had removed it', () => {
		expect(rebuildOrder([classico], products, none, new Set(['tomate'])).skipped).toEqual([
			'Clássico'
		]);
		expect(rebuildOrder([classico], products, none, new Set(['picles'])).lines).toHaveLength(1);
	});
});
