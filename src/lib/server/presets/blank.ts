// Deku Lib, the template a new shop starts from: black and light grey, a plain mark,
// the shop's name as the wordmark and a single sample product. The catalog's own
// wording is already brand-free, so there is nothing to replace.
import { starterCatalog } from '../catalog/starter';
import type { Preset } from './index';

const dir = '/presets/blank';

export const blank: Preset = {
	shopName: 'Deku Lib',
	colors: { primary: '#d4d4d8', dark: '#09090b', background: '#f4f4f5' },
	images: {
		logo: `${dir}/mark.svg`,
		// Drawn from the shop's name (src/routes/presets/wordmark.svg).
		wordmark: '/presets/wordmark.svg',
		heroImage: `${dir}/hero.svg`,
		heroLogo: `${dir}/mark.svg`,
		icon: `${dir}/icon-512.png`,
		loginImage: `${dir}/hero.svg`,
		staffBackground: `${dir}/hero.svg`
	},
	srcsets: {},
	icons: {
		favicon: `${dir}/favicon.png`,
		appleTouch: `${dir}/apple-touch-icon.png`,
		icon192: `${dir}/icon-192.png`,
		icon512: `${dir}/icon-512.png`,
		maskable: `${dir}/icon-maskable-512.png`
	},
	lockup: null,
	texts: {},
	pages: {},
	catalog: starterCatalog,
	productIcon: 'grid',
	// Cool greys instead of the warm ones in layout.css and Tailwind's stone, so the dark
	// theme reads as black. :root:root outranks layout.css, which loads after this.
	css:
		':root:root{--color-muted:#52525b;--color-line:#e4e4e7;--color-quiet:#f4f4f5;--color-cream:#f4f4f5;' +
		'--color-stone-50:#fafafa;--color-stone-100:#f4f4f5;--color-stone-200:#e4e4e7;--color-stone-300:#d4d4d8;--color-stone-400:#a1a1aa;' +
		'--color-stone-500:#71717a;--color-stone-600:#52525b;--color-stone-700:#3f3f46;--color-stone-800:#27272a;--color-stone-900:#18181b;--color-stone-950:#09090b}' +
		":root:root[data-theme='dark']{--color-ink:#fafafa;--color-muted:#a1a1aa;--color-line:#27272a;" +
		'--color-surface:#18181b;--color-quiet:#27272a;--color-canvas:#09090b}'
};
