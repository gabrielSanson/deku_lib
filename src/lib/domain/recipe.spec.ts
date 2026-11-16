import { describe, expect, it } from 'vitest';
import {
	averageCostMicro,
	expandRecipe,
	recipeCostCents,
	roundHalfEven,
	type RecipeLine
} from './recipe';

const recipes: RecipeLine[] = [
	{ productSku: 'x-burger', optionSku: null, stockItemId: 'pao', qtyBase: 1, ingredientId: null },
	{
		productSku: 'x-burger',
		optionSku: null,
		stockItemId: 'carne',
		qtyBase: 150,
		ingredientId: null
	},
	{
		productSku: 'x-burger',
		optionSku: null,
		stockItemId: 'cebola',
		qtyBase: 20,
		ingredientId: 'cebola'
	},
	{ productSku: null, optionSku: 'bacon', stockItemId: 'bacon', qtyBase: 30, ingredientId: null },
	{
		productSku: null,
		optionSku: 'carne-extra',
		stockItemId: 'carne',
		qtyBase: 150,
		ingredientId: null
	}
];

describe('recipe', () => {
	it('expands product lines times quantity, plus options', () => {
		const u = expandRecipe(
			{
				productSku: 'x-burger',
				quantity: 2,
				options: [
					{ sku: 'bacon', quantity: 1 },
					{ sku: 'carne-extra', quantity: 1 }
				],
				removed: []
			},
			recipes
		)!;
		expect(Object.fromEntries(u)).toEqual({ pao: 2, carne: 600, cebola: 40, bacon: 60 });
	});

	it('skips a removed ingredient', () => {
		const u = expandRecipe(
			{ productSku: 'x-burger', quantity: 1, options: [], removed: ['cebola'] },
			recipes
		)!;
		expect(u.has('cebola')).toBe(false);
	});

	it('returns null for a product without a recipe', () => {
		expect(
			expandRecipe({ productSku: 'soda', quantity: 1, options: [], removed: [] }, recipes)
		).toBe(null);
	});

	it('costs the usage and rounds half to even', () => {
		// carne R$40/kg = 4 centavos per g = 4_000_000 micro; pão R$1,00.
		const cost = recipeCostCents(
			new Map([
				['carne', 150],
				['pao', 1]
			]),
			new Map([
				['carne', 4_000_000],
				['pao', 100_000_000]
			])
		);
		expect(cost).toBe(700);
		expect(roundHalfEven(53.5)).toBe(54);
		expect(roundHalfEven(52.5)).toBe(52);
		expect(roundHalfEven(53.4)).toBe(53);
	});

	it('averages cost on purchase, ignoring negative stock', () => {
		// 1000 g at 4 c/g, buy 1000 g for R$60 → 5 c/g.
		expect(averageCostMicro(1000, 4_000_000, 1000, 6000)).toBe(5_000_000);
		expect(averageCostMicro(-200, 4_000_000, 1000, 6000)).toBe(6_000_000);
	});
});
