import { defaultBranding, getBranding, themeCss } from '#lib/server/settings/branding.ts';
import { getTexts } from '#lib/server/settings/texts.ts';
import { defaultTexts, type Texts } from '#lib/texts/catalog.ts';
import type { LayoutServerLoad } from './$types';

// Texts and look for every page. If the database is unreachable the shop still
// renders (and can show its error page) with the built-in defaults.
export const load: LayoutServerLoad = async () => {
	const [texts, branding] = await Promise.all([
		getTexts().catch((): Texts => defaultTexts()),
		getBranding().catch(() => defaultBranding())
	]);
	return { texts, branding, themeCss: themeCss(branding.colors) };
};
