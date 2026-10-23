import { describe, expect, it } from 'vitest';
import { DEFAULT_HOME, parseHome, validateHome } from './home';

describe('home layout', () => {
	it('falls back to the built-in layout for anything missing or invalid', () => {
		expect(parseHome(null)).toEqual(DEFAULT_HOME);
		expect(
			parseHome({ heroAlign: 'diagonal', featuredCount: 4, primaryHref: 'javascript:x' })
		).toEqual(DEFAULT_HOME);
	});

	it('keeps valid choices', () => {
		const home = parseHome({
			heroAlign: 'center',
			heroSize: 'compact',
			showModes: false,
			secondaryHref: '/p/sobre',
			featuredCategoryId: '0b6f7a0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
			featuredCount: 6
		});
		expect(home).toMatchObject({
			heroAlign: 'center',
			heroSize: 'compact',
			showModes: false,
			secondaryHref: '/p/sobre',
			featuredCount: 6
		});
	});

	it('accepts site paths and https links only', () => {
		expect(validateHome({ primaryHref: 'https://wa.me/5511999999999' }).primaryHref).toBe(
			'https://wa.me/5511999999999'
		);
		expect(() => validateHome({ primaryHref: '//evil.example' })).toThrow();
		expect(() => validateHome({ secondaryHref: 'http://example.com' })).toThrow();
		expect(validateHome({ secondaryHref: '' }).secondaryHref).toBeNull();
	});
});
