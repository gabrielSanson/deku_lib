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

	it('blank has no Deku wording, pictures or name', () => {
		expect(JSON.stringify(PRESETS.blank)).not.toMatch(/deku|burger/i);
	});
});
