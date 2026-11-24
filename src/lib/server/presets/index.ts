// The built-in look a shop starts from, picked with SHOP_PRESET. "blank" (the default)
// is the Deku Lib template: dark, unbranded, one sample product; "deku" is Deku Burger's
// art, colours, wording and sample menu. Whatever the owner sets in Configurações (Aparência, Textos, Páginas) wins
// over the preset, so switching presets never touches saved edits.
import type { IconName } from '#lib/components/atoms/Icon.svelte';
import type { Catalog } from '#lib/domain/catalog.ts';
import type { TextKey } from '#lib/texts/catalog.ts';
import { ADMIN_MODES, type AdminMode } from '#lib/staff/admin-mode.ts';
import type { ColorKey, ImageKey } from '../settings/branding';
import { blank } from './blank';
import { cookie } from './cookie';
import { deku } from './deku';
import { currentShopId, DEFAULT_SHOP_ID } from '../db';
import { knownShop } from '../platform/shops';

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
	/** How much of the staff area the shop starts with; ADMIN_MODE in .env overrides it. */
	adminMode: AdminMode;
}

export const PRESETS = { blank, deku, cookie } satisfies Record<string, Preset>;
export type PresetId = keyof typeof PRESETS;
export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

/**
 * The current shop's look. A single-shop install follows SHOP_PRESET in .env; hosted shops use
 * the look chosen at sign-up (shops.preset).
 */
export function presetId(): PresetId {
	const id = currentShopId();
	const v = id === DEFAULT_SHOP_ID ? process.env.SHOP_PRESET : undefined;
	const chosen = v || knownShop(id)?.preset;
	return chosen && chosen in PRESETS ? (chosen as PresetId) : 'blank';
}

/** The current shop's name before the owner sets one: SHOP_NAME (single shop) or the sign-up name. */
export function defaultShopName(): string {
	const id = currentShopId();
	const env = id === DEFAULT_SHOP_ID ? process.env.SHOP_NAME : undefined;
	const signup = id === DEFAULT_SHOP_ID ? undefined : knownShop(id)?.name;
	return env || signup || preset().shopName;
}

export function preset(): Preset {
	return PRESETS[presetId()];
}

/**
 * Full back office or the simple one (orders, menu, site). A single-shop install can set
 * ADMIN_MODE=full|simple in .env; otherwise the preset decides.
 */
export function adminMode(): AdminMode {
	const env = currentShopId() === DEFAULT_SHOP_ID ? process.env.ADMIN_MODE : undefined;
	return ADMIN_MODES.includes(env as AdminMode) ? (env as AdminMode) : preset().adminMode;
}
