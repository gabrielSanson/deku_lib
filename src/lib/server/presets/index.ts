// The built-in look a shop starts from, picked with SHOP_PRESET. "blank" (the default)
// is the Deku Lib template: dark, unbranded, one sample product; "deku" is Deku Burger's
// art, colours, wording and sample menu. Whatever the owner sets in Configurações (Aparência, Textos, Páginas) wins
// over the preset, so switching presets never touches saved edits.
import type { IconName } from '#lib/components/atoms/Icon.svelte';
import type { Catalog } from '#lib/domain/catalog.ts';
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
	/** Menu loaded by `pnpm seed` and by "start from the example" in the wizard and menu editor. */
	catalog: Catalog;
	/** Icon drawn where a product or category has no photo. */
	productIcon: IconName;
	/** Extra CSS variables for the neutral tokens layout.css does not take from the brand colours. */
	css: string;
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
