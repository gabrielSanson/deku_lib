// The shop's look: brand colours, logos and app icon, edited by the owner.
// Anything not set falls back to the shop preset (src/lib/server/presets).
import { CONTRAST_LABELS_PT, contrastFailures } from '../../domain/contrast';
import { audit, type Actor } from '../audit';
import { menuImageUrl } from '../catalog/images';
import { db, type Db } from '../db';
import { DomainError } from '../errors';
import { preset, type PresetIcons } from '../presets';
import { DEFAULT_HOME, parseHome, type HomeLayout } from './home';

export const COLOR_KEYS = ['primary', 'dark', 'background'] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];
export const IMAGE_KEYS = [
	'logo',
	'wordmark',
	'heroImage',
	'heroLogo',
	'icon',
	'loginImage',
	'staffBackground'
] as const;
export type ImageKey = (typeof IMAGE_KEYS)[number];

/** The colours written in src/routes/layout.css; themeCss swaps in anything else. */
const CSS_COLORS: Record<ColorKey, string> = {
	primary: '#ffbc00',
	dark: '#0b0b0b',
	background: '#faf7f0'
};

/** The preset's colours, used where the owner kept the built-in one. */
export function defaultColors(): Record<ColorKey, string> {
	return preset().colors;
}

export interface Branding {
	/** Null where the owner kept the built-in colour. */
	colors: Record<ColorKey, string | null>;
	images: Record<ImageKey, string>;
	/** srcset for the preset's photos; none for an uploaded image. */
	srcset: Partial<Record<ImageKey, string>>;
	/** True for the images the owner uploaded. */
	custom: Record<ImageKey, boolean>;
	/** The preset's browser and app icons, used until the owner uploads an icon. */
	icons: PresetIcons;
	/** The preset's logo-and-name picture; null when there is none or the owner uploaded a logo. */
	lockup: string | null;
	/** The home page's arrangement (see home.ts). */
	home: HomeLayout;
}

export function defaultBranding(): Branding {
	const p = preset();
	return {
		colors: { primary: null, dark: null, background: null },
		images: { ...p.images },
		srcset: { ...p.srcsets },
		custom: Object.fromEntries(IMAGE_KEYS.map((k) => [k, false])) as Branding['custom'],
		icons: p.icons,
		lockup: p.lockup,
		home: { ...DEFAULT_HOME }
	};
}

const COLUMNS: Record<ColorKey | ImageKey, string> = {
	primary: 'color_primary',
	dark: 'color_dark',
	background: 'color_background',
	logo: 'logo_path',
	wordmark: 'wordmark_path',
	heroImage: 'hero_image_path',
	heroLogo: 'hero_logo_path',
	icon: 'icon_path',
	loginImage: 'login_image_path',
	staffBackground: 'staff_background_path'
};
const HEX = /^#[0-9a-f]{6}$/;

const TTL_MS = 10_000;
let cache: { value: Branding; at: number } | undefined;

export async function getBranding(sql: Db = db(), { fresh = false } = {}): Promise<Branding> {
	if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache.value;
	const [r] = await sql<Record<string, string | null>[]>`select * from store_branding where id = 1`;
	const layout: unknown = (r as Record<string, unknown> | undefined)?.home_layout;
	const colors = Object.fromEntries(
		COLOR_KEYS.map((k) => [k, r?.[COLUMNS[k]] ?? null])
	) as Branding['colors'];
	const uploaded = Object.fromEntries(
		IMAGE_KEYS.map((k) => [k, menuImageUrl(r?.[COLUMNS[k]] ?? null)])
	) as Record<ImageKey, string | null>;
	const p = preset();
	const images = Object.fromEntries(
		IMAGE_KEYS.map((k) => [k, uploaded[k] ?? p.images[k]])
	) as Branding['images'];
	const srcset = Object.fromEntries(
		IMAGE_KEYS.filter((k) => !uploaded[k] && p.srcsets[k]).map((k) => [k, p.srcsets[k]])
	) as Branding['srcset'];
	// Until the owner picks one, the customer sign-in page reuses the home photo.
	if (!uploaded.loginImage) {
		images.loginImage = images.heroImage;
		srcset.loginImage = srcset.heroImage;
	}
	const value: Branding = {
		colors,
		images,
		srcset,
		custom: Object.fromEntries(
			IMAGE_KEYS.map((k) => [k, uploaded[k] !== null])
		) as Branding['custom'],
		icons: p.icons,
		lockup: uploaded.logo || uploaded.wordmark ? null : p.lockup,
		home: parseHome(layout)
	};
	cache = { value, at: Date.now() };
	return value;
}

/** Null (or the default) puts a colour back to the built-in one. */
export async function saveColors(input: Record<ColorKey, string | null>, actor: Actor) {
	const next = {} as Record<ColorKey, string | null>;
	for (const k of COLOR_KEYS) {
		const v = input[k]?.trim().toLowerCase() || null;
		if (v !== null && !HEX.test(v)) throw new DomainError('err.settings.color');
		next[k] = v === defaultColors()[k] ? null : v;
	}
	// Refuse colours that would make storefront text unreadable, naming each pair.
	const fails = contrastFailures({
		primary: next.primary ?? defaultColors().primary,
		dark: next.dark ?? defaultColors().dark,
		background: next.background ?? defaultColors().background
	});
	if (fails.length) {
		const list = fails
			.map((f) => `${CONTRAST_LABELS_PT[f.id]} (${String(f.ratio).replace('.', ',')}:1)`)
			.join('; ');
		throw new DomainError('err.settings.contrast', { vars: { list } });
	}
	await db().begin(async (tx) => {
		await tx`update store_branding set color_primary = ${next.primary}, color_dark = ${next.dark},
			color_background = ${next.background}, updated_by = ${actor.id}, updated_at = now() where id = 1`;
		await audit(tx, actor, 'store.colors_updated', 'store_branding', '1', next);
	});
	cache = undefined;
}

/** `path` is an uploaded image's Storage path; null goes back to the built-in image. */
export async function setBrandImage(key: ImageKey, path: string | null, actor: Actor) {
	if (!IMAGE_KEYS.includes(key)) throw new DomainError('err.image.unknown');
	if (path !== null && !menuImageUrl(path)) throw new DomainError('err.image.invalid');
	await db().begin(async (tx) => {
		await tx`update store_branding set ${tx({ [COLUMNS[key]]: path })},
			updated_by = ${actor.id}, updated_at = now() where id = 1`;
		await audit(tx, actor, 'store.image_updated', 'store_branding', '1', { image: key, path });
	});
	cache = undefined;
}

export async function saveHome(layout: HomeLayout, actor: Actor) {
	await db().begin(async (tx) => {
		await tx`update store_branding set home_layout = ${tx.json(layout as never)},
			updated_by = ${actor.id}, updated_at = now() where id = 1`;
		await audit(tx, actor, 'store.home_updated', 'store_branding', '1', { ...layout });
	});
	cache = undefined;
}

/**
 * CSS that swaps the theme colours: the owner's, else the preset's. Empty when they
 * are the ones already written in layout.css.
 */
export function themeCss(colors: Branding['colors']): string {
	const vars: string[] = [];
	const darkVars: string[] = [];
	const base = defaultColors();
	const pick = (k: ColorKey) => {
		const v = colors[k] ?? base[k];
		// Colours are validated hex on save and re-checked here before going into a <style>.
		return HEX.test(v) && v !== CSS_COLORS[k] ? v : null;
	};
	const primary = pick('primary');
	const dark = pick('dark');
	const background = pick('background');
	if (primary) {
		vars.push(
			`--color-brand-500:${primary}`,
			`--color-brand-50:color-mix(in oklab,${primary} 12%,white)`,
			`--color-brand-100:color-mix(in oklab,${primary} 30%,white)`,
			`--color-brand-400:color-mix(in oklab,${primary} 85%,white)`,
			`--color-brand-600:color-mix(in oklab,${primary} 90%,black)`,
			// Readable "brand" text on light backgrounds.
			`--color-brand-700:color-mix(in oklab,${primary} 45%,black)`,
			`--color-brand-tint:color-mix(in oklab,${primary} 20%,white)`
		);
		// The dark theme pins its own brand shades in layout.css; follow the new colour there too.
		darkVars.push(
			`--color-brand-700:color-mix(in oklab,${primary} 85%,white)`,
			`--color-brand-50:color-mix(in oklab,${primary} 16%,black)`,
			`--color-brand-100:color-mix(in oklab,${primary} 24%,black)`,
			`--color-brand-tint:color-mix(in oklab,${primary} 20%,black)`
		);
	}
	if (dark) {
		vars.push(
			`--color-night:${dark}`,
			`--color-night-2:color-mix(in oklab,${dark} 92%,white)`,
			`--color-night-line:color-mix(in oklab,${dark} 82%,white)`
		);
	}
	const light = background ? `:root:not([data-theme='dark']){--color-canvas:${background}}` : '';
	return (
		(vars.length ? `:root{${vars.join(';')}}` : '') +
		(darkVars.length ? `:root[data-theme='dark']{${darkVars.join(';')}}` : '') +
		light
	);
}
