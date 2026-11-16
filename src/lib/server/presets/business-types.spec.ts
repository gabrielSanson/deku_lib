import { describe, expect, it } from 'vitest';
import { categoryIcon } from '#lib/domain/category-icon.ts';
import { BUSINESS_TYPES } from '#lib/domain/signup.ts';
import { TEXTS } from '#lib/texts/catalog.ts';
import { BUSINESS_TYPE_STARTS } from './business-types';

// Words that only fit one kind of shop. The neutral defaults must name none of them; the
// business types and presets put them back where they fit.
const FOOD =
	/hamb[uú]rguer|burger|lanche|pizza|a[çc]a[ií]|batata|fritas|x-salada|smash|sushi|cerveja|refrigerante|milkshake|bacon|cheddar|ponto da carne/i;

describe('business types', () => {
	it('neutral default texts name no specific food', () => {
		const offenders = Object.entries(TEXTS)
			.filter(([, def]) => FOOD.test(def.default))
			.map(([key]) => key);
		expect(offenders).toEqual([]);
	});

	it('every type has a valid starting menu, modes and NCM', () => {
		for (const type of BUSINESS_TYPES) {
			const start = BUSINESS_TYPE_STARTS[type];
			const cats = new Set(start.catalog.categories.map((c) => c.id));
			const skus = start.catalog.products.map((p) => p.sku);
			expect(new Set(skus).size, type).toBe(skus.length);
			for (const p of start.catalog.products) {
				expect(cats.has(p.categoryId), `${type} ${p.sku}`).toBe(true);
				expect(p.priceCents, `${type} ${p.sku}`).toBeGreaterThan(0);
			}
			expect(start.suggestedNcm).toMatch(/^\d{8}$/);
			expect(start.modes.pickup || start.modes.delivery || start.modes.dineIn).toBe(true);
			for (const key of Object.keys(start.texts)) expect(key in TEXTS, key).toBe(true);
		}
	});

	it('draws a fitting icon for the starting categories', () => {
		expect(categoryIcon('Pizzas')).toBe('chef');
		expect(categoryIcon('Lanches')).toBe('burger');
		expect(categoryIcon('Açaí')).toBe('dessert');
		expect(categoryIcon('Bebidas')).toBe('drink');
	});
});
