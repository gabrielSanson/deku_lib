import { describe, expect, it } from 'vitest';
import { slugProblem, suggestSlug } from './signup';

describe('shop address', () => {
	it('accepts short lowercase names with hyphens', () => {
		expect(slugProblem('lanchonete-do-ze')).toBeNull();
		expect(slugProblem('ze1')).toBeNull();
	});

	it('refuses bad formats and the platform’s own names', () => {
		expect(slugProblem('A')).toBe('format');
		expect(slugProblem('-loja')).toBe('format');
		expect(slugProblem('loja-')).toBe('format');
		expect(slugProblem('lo--ja')).toBe('format');
		expect(slugProblem('loja_ze')).toBe('format');
		expect(slugProblem('x'.repeat(41))).toBe('format');
		expect(slugProblem('www')).toBe('reserved');
		expect(slugProblem('plataforma')).toBe('reserved');
	});

	it('suggests one from the shop name', () => {
		expect(suggestSlug('Lanchonete do Zé')).toBe('lanchonete-do-ze');
		expect(suggestSlug('Açaí & Cia')).toBe('acai-cia');
		expect(suggestSlug('Z')).toBe('z-1');
	});
});
