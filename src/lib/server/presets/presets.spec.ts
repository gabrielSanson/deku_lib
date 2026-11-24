import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastFailures } from '#lib/domain/contrast.ts';
import { placeholders, TEXTS } from '#lib/texts/catalog.ts';
import { PRESET_IDS, PRESETS } from './index';

describe('shop presets', () => {
	for (const id of PRESET_IDS) {
		const p = PRESETS[id];
		it(`${id}: wording keeps the {names} each text fills in`, () => {
			expect.hasAssertions();
			expect(p.texts).toBeTypeOf('object');
			for (const [key, text] of Object.entries(p.texts)) {
				const def = TEXTS[key as keyof typeof TEXTS];
				expect(def, key).toBeDefined();
				expect(placeholders(text!), key).toEqual(placeholders(def.default));
			}
		});

		it(`${id}: colours pass the storefront contrast checks`, () => {
			expect(contrastFailures(p.colors)).toEqual([]);
		});
	}

	it('blank is Deku Lib, with no Deku Burger wording, pictures or menu', () => {
		expect(PRESETS.blank.shopName).toBe('Deku Lib');
		expect(JSON.stringify({ ...PRESETS.blank, shopName: '' })).not.toMatch(
			/deku|burger|hamb[uú]rguer|lanche|bacon|cebola/i
		);
		expect(PRESETS.blank.catalog.products).toHaveLength(1);
		expect(PRESETS.blank.catalog.products[0].imageUrl).toBeNull();
	});
});

describe('cookie preset', () => {
	const c = PRESETS.cookie;

	it('sells cookies, boxes and drinks with the simple staff area', () => {
		expect(c.adminMode).toBe('simple');
		expect(c.catalog.categories.map((x) => x.id)).toEqual([
			'classicos',
			'recheados',
			'caixas',
			'bebidas'
		]);
		expect(JSON.stringify(c)).not.toMatch(/deku|burger|hamb[uú]rguer/i);
	});

	it('every box asks for exactly as many flavours as it holds', () => {
		const boxes = c.catalog.products.filter((p) => p.categoryId === 'caixas');
		expect(boxes.length).toBeGreaterThan(0);
		for (const b of boxes) {
			const size = Number(b.sku.split('-')[1]);
			const [g] = b.modifierGroups;
			expect([g.minSelections, g.maxSelections]).toEqual([size, size]);
			expect(g.options.every((o) => o.maxQuantity === size)).toBe(true);
		}
	});

	it('every picture it points at exists', () => {
		const urls = [
			...Object.values(c.images),
			...Object.values(c.icons),
			...c.catalog.products.flatMap((p) => [
				p.imageUrl,
				...p.modifierGroups.flatMap((g) => g.options.map((o) => o.imageUrl))
			])
		].filter((u): u is string => !!u && u.startsWith('/presets/cookie/'));
		expect(urls.length).toBeGreaterThan(10);
		for (const u of urls) expect(existsSync(`static${u}`), u).toBe(true);
	});

	it('option and product SKUs are unique', () => {
		const skus = [
			...c.catalog.products.map((p) => p.sku),
			...new Set(
				c.catalog.products.flatMap((p) =>
					p.modifierGroups.flatMap((g) => g.options.map((o) => o.sku))
				)
			)
		];
		expect(new Set(skus).size).toBe(skus.length);
	});
});
