// A plain shop: neutral colours, a generic mark and the shop's name as the wordmark.
// The catalog's own wording is already brand-free, so there is nothing to replace.
import type { Preset } from './index';

const dir = '/presets/blank';

export const blank: Preset = {
	shopName: 'Minha loja',
	colors: { primary: '#60a5fa', dark: '#111827', background: '#f8fafc' },
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
	pages: {}
};
