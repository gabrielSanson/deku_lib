// The built-in look a shop starts from, picked with SHOP_PRESET. "blank" (the default)
// is a plain shop with no brand of its own; "deku" is Deku Burger's art, colours and
// wording. Whatever the owner sets in Configurações (Aparência, Textos, Páginas) wins
// over the preset, so switching presets never touches saved edits.
import type { TextKey } from '#lib/texts/catalog.ts';
import type { ColorKey, ImageKey } from '../settings/branding';
import { blank } from './blank';
import { deku } from './deku';

export interface PresetIcons {
	favicon: string;
	appleTouch: string;
	icon192: string;
	icon512: string;
	maskable: string;
}

export interface Preset {
	/** Shop name until SHOP_NAME or Configurações → Loja sets one. */
	shopName: string;
	colors: Record<ColorKey, string>;
	images: Record<ImageKey, string>;
	/** srcset for built-in photos that come in more than one size. */
	srcsets: Partial<Record<ImageKey, string>>;
	icons: PresetIcons;
	/** Logo and name in one picture, for the staff sign-in; null shows logo and wordmark. */
	lockup: string | null;
	/** Wording that replaces the catalog defaults in src/lib/texts. */
	texts: Partial<Record<TextKey, string>>;
	/** Text of the built-in site pages (sobre, alergenicos, ...) that differs from the plain one. */
	pages: Record<string, string[]>;
}

export const PRESETS = { blank, deku } satisfies Record<string, Preset>;
export type PresetId = keyof typeof PRESETS;
export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

export function presetId(): PresetId {
	const v = process.env.SHOP_PRESET;
	return v && v in PRESETS ? (v as PresetId) : 'blank';
}

export function preset(): Preset {
	return PRESETS[presetId()];
}
