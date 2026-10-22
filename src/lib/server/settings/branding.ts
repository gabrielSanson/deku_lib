// The shop's look: brand colours, logos and app icon, edited by the owner.
// Anything not set falls back to the Deku Burger brand files in static/brand.
import { audit, type Actor } from '../audit';
import { menuImageUrl } from '../catalog/images';
import { db, type Db } from '../db';
import { DomainError } from '../errors';

export const COLOR_KEYS = ['primary', 'dark', 'background'] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];
export const IMAGE_KEYS = ['logo', 'wordmark', 'heroLogo', 'icon'] as const;
export type ImageKey = (typeof IMAGE_KEYS)[number];

export const DEFAULT_COLORS: Record<ColorKey, string> = {
	primary: '#ffbc00',
	dark: '#0b0b0b',
	background: '#faf7f0'
};
export const DEFAULT_IMAGES: Record<ImageKey, string> = {
	logo: '/brand/deku-mark.png',
	wordmark: '/brand/deku-wordmark.png',
	heroLogo: '/hero/burger-1200.webp',
	icon: '/icon-512.png'
};

export interface Branding {
	/** Null where the owner kept the built-in colour. */
	colors: Record<ColorKey, string | null>;
	images: Record<ImageKey, string>;
	/** True for the images the owner uploaded. */
	custom: Record<ImageKey, boolean>;
}

export function defaultBranding(): Branding {
	return {
		colors: { primary: null, dark: null, background: null },
		images: { ...DEFAULT_IMAGES },
		custom: { logo: false, wordmark: false, heroLogo: false, icon: false }
	};
}

const COLUMNS: Record<ColorKey | ImageKey, string> = {
	primary: 'color_primary',
	dark: 'color_dark',
	background: 'color_background',
	logo: 'logo_path',
	wordmark: 'wordmark_path',
	heroLogo: 'hero_logo_path',
	icon: 'icon_path'
};
const HEX = /^#[0-9a-f]{6}$/;

const TTL_MS = 10_000;
let cache: { value: Branding; at: number } | undefined;

export async function getBranding(sql: Db = db(), { fresh = false } = {}): Promise<Branding> {
	if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache.value;
	const [r] = await sql<Record<string, string | null>[]>`select * from store_branding where id = 1`;
	const colors = Object.fromEntries(
		COLOR_KEYS.map((k) => [k, r?.[COLUMNS[k]] ?? null])
	) as Branding['colors'];
	const uploaded = Object.fromEntries(
		IMAGE_KEYS.map((k) => [k, menuImageUrl(r?.[COLUMNS[k]] ?? null)])
	) as Record<ImageKey, string | null>;
	const value: Branding = {
		colors,
		images: Object.fromEntries(
			IMAGE_KEYS.map((k) => [k, uploaded[k] ?? DEFAULT_IMAGES[k]])
		) as Branding['images'],
		custom: Object.fromEntries(
			IMAGE_KEYS.map((k) => [k, uploaded[k] !== null])
		) as Branding['custom']
	};
	cache = { value, at: Date.now() };
	return value;
}

/** Null (or the default) puts a colour back to the built-in one. */
export async function saveColors(input: Record<ColorKey, string | null>, actor: Actor) {
	const next = {} as Record<ColorKey, string | null>;
	for (const k of COLOR_KEYS) {
		const v = input[k]?.trim().toLowerCase() || null;
		if (v !== null && !HEX.test(v)) throw new DomainError('Cor inválida. Use o formato #RRGGBB.');
		next[k] = v === DEFAULT_COLORS[k] ? null : v;
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
	if (!IMAGE_KEYS.includes(key)) throw new DomainError('Imagem desconhecida.');
	if (path !== null && !menuImageUrl(path)) throw new DomainError('Imagem inválida.');
	await db().begin(async (tx) => {
		await tx`update store_branding set ${tx({ [COLUMNS[key]]: path })},
			updated_by = ${actor.id}, updated_at = now() where id = 1`;
		await audit(tx, actor, 'store.image_updated', 'store_branding', '1', { image: key, path });
	});
	cache = undefined;
}

/** CSS that swaps the theme colours; empty when every colour is the default. */
export function themeCss(colors: Branding['colors']): string {
	const vars: string[] = [];
	const { primary, dark, background } = colors;
	// Colours are validated hex on save and re-checked here before going into a <style>.
	if (primary && HEX.test(primary)) {
		vars.push(
			`--color-brand-500:${primary}`,
			`--color-brand-50:color-mix(in oklab,${primary} 12%,white)`,
			`--color-brand-100:color-mix(in oklab,${primary} 30%,white)`,
			`--color-brand-400:color-mix(in oklab,${primary} 85%,white)`,
			`--color-brand-600:color-mix(in oklab,${primary} 90%,black)`,
			// Readable "brand" text on light backgrounds.
			`--color-brand-700:color-mix(in oklab,${primary} 45%,black)`
		);
	}
	if (dark && HEX.test(dark)) {
		vars.push(
			`--color-night:${dark}`,
			`--color-night-2:color-mix(in oklab,${dark} 92%,white)`,
			`--color-night-line:color-mix(in oklab,${dark} 82%,white)`
		);
	}
	const light =
		background && HEX.test(background)
			? `:root:not([data-theme='dark']){--color-canvas:${background}}`
			: '';
	return (vars.length ? `:root{${vars.join(';')}}` : '') + light;
}
