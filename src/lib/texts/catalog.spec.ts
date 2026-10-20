import { describe, expect, it } from 'vitest';
import { defaultTexts, fill, isTextKey, placeholders, TEXT_GROUPS, TEXTS } from './catalog';

describe('text catalog', () => {
	it('fills {names} and leaves unknown ones', () => {
		expect(fill('Pedido #{number} de {name}', { number: 42 })).toBe('Pedido #42 de {name}');
	});

	it('lists the {names} a text needs', () => {
		expect(placeholders('{b} e {a} e {b}')).toEqual(['a', 'b']);
		expect(placeholders('sem chaves')).toEqual([]);
	});

	it('has a known group, a label and a default for every text', () => {
		for (const [key, def] of Object.entries(TEXTS)) {
			expect(isTextKey(key)).toBe(true);
			expect(Object.keys(TEXT_GROUPS)).toContain(def.group);
			expect(def.label.length).toBeGreaterThan(0);
			expect(def.default.length).toBeGreaterThan(0);
			expect(def.default.length).toBeLessThanOrEqual(1000);
		}
		expect(isTextKey('toString')).toBe(false);
	});

	it('keeps the offline and error copy short and direct', () => {
		const t = defaultTexts();
		expect(t['errors.offline']).toBe('Você está sem conexão.');
		expect(t['errors.generic']).toBe('Houve um erro. Por favor, atualize a página.');
		expect(Object.values(t).join(' ')).not.toMatch(/desatualizad/);
	});
});
