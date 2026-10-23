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
