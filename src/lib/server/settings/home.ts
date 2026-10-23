// How the home page is laid out, chosen by the owner in Configurações → Página inicial.
// The words live in the text catalog and the photos in store_branding; this is only
// the arrangement. Anything missing or invalid falls back to the built-in layout.
import { DomainError } from '../errors';

/** The blocks under the hero, which the owner can put in any order. The hero stays first. */
export const HOME_BLOCKS = ['featured', 'menuButton'] as const;
export type HomeBlock = (typeof HOME_BLOCKS)[number];

export interface HomeLayout {
	/** Where the hero text sits over the photo. */
	heroAlign: 'left' | 'center';
	/** "tall" fills most of the first screen; "compact" leaves the menu in view. */
	heroSize: 'tall' | 'compact';
	/** Shows the hero image (a cut-out, e.g. a burger) beside the text. Left alignment only. */
	heroCutout: boolean;
	/** The open/closed pill above the title. */
	showStatus: boolean;
	/** The row with retirada, entrega and the preparation time. */
	showModes: boolean;
	primaryHref: string;
	/** Null hides the second button. */
	secondaryHref: string | null;
	showFeatured: boolean;
	/** Category whose products fill the featured row; null picks "Destaques" or the first photos. */
	featuredCategoryId: string | null;
	featuredCount: 4 | 8;
	/** The big "Ver cardápio completo" button under the featured row. */
	showMenuButton: boolean;
	/** Order of the blocks under the hero; every block appears once. */
	blockOrder: HomeBlock[];
}

export const DEFAULT_HOME: HomeLayout = {
	heroAlign: 'left',
	heroSize: 'tall',
	heroCutout: false,
	showStatus: true,
	showModes: true,
	primaryHref: '/cardapio',
	secondaryHref: null,
	showFeatured: true,
	featuredCategoryId: null,
	featuredCount: 4,
	showMenuButton: true,
	blockOrder: [...HOME_BLOCKS]
};

/** A path on this site ("/cardapio", "/p/sobre", "/cardapio#bebidas") or an https address. */
const LINK = /^(\/(?!\/)[^\s<>"']*|https:\/\/[^\s<>"']+)$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLink(v: string): boolean {
	return v.length <= 300 && LINK.test(v);
}

/** Known blocks in the given order, without repeats, with any missing ones added at the end. */
function blockOrder(raw: unknown): HomeBlock[] {
	const given = Array.isArray(raw) ? raw : [];
	const known = given.filter(
		(b, i): b is HomeBlock =>
			(HOME_BLOCKS as readonly unknown[]).includes(b) && given.indexOf(b) === i
	);
	return [...known, ...HOME_BLOCKS.filter((b) => !known.includes(b))];
}

/** Reads a stored (or posted) layout, keeping the defaults for anything not valid. */
export function parseHome(raw: unknown): HomeLayout {
	const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	const bool = (k: keyof HomeLayout) =>
		typeof r[k] === 'boolean' ? (r[k] as boolean) : (DEFAULT_HOME[k] as boolean);
	const str = (k: string) => (typeof r[k] === 'string' ? (r[k] as string).trim() : '');
	return {
		heroAlign: r.heroAlign === 'center' ? 'center' : 'left',
		heroSize: r.heroSize === 'compact' ? 'compact' : 'tall',
		heroCutout: bool('heroCutout'),
		showStatus: bool('showStatus'),
		showModes: bool('showModes'),
		primaryHref: isLink(str('primaryHref')) ? str('primaryHref') : DEFAULT_HOME.primaryHref,
		secondaryHref: isLink(str('secondaryHref')) ? str('secondaryHref') : null,
		showFeatured: bool('showFeatured'),
		featuredCategoryId: UUID.test(str('featuredCategoryId')) ? str('featuredCategoryId') : null,
		// 3 and 6 were the choices before the desktop row went to four (mockup 01).
		featuredCount: r.featuredCount === 8 || r.featuredCount === 6 ? 8 : 4,
		showMenuButton: bool('showMenuButton'),
		blockOrder: blockOrder(r.blockOrder)
	};
}

/** Checks the posted links so a typo is reported instead of silently dropped. */
export function validateHome(input: Record<string, unknown>): HomeLayout {
	for (const k of ['primaryHref', 'secondaryHref'] as const) {
		const v = typeof input[k] === 'string' ? (input[k] as string).trim() : '';
		if (v && !isLink(v)) throw new DomainError('err.settings.link', { code: k });
	}
	return parseHome(input);
}
