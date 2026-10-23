// Installable kitchen display: opens straight into the KDS, full screen, landscape.
// Uses the app icon and dark colour from Aparência, like the shop's own manifest.
import { DEFAULT_COLORS, getBranding } from '#lib/server/settings/branding.ts';
import { shopName } from '#lib/server/settings/profile.ts';
import type { RequestHandler } from './$types';

const DEFAULT_ICONS = [
	{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
	{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
];

export const GET: RequestHandler = async () => {
	const [name, branding] = await Promise.all([shopName(), getBranding()]);
	const dark = branding.colors.dark ?? DEFAULT_COLORS.dark;
	const icon = branding.images.icon;
	const type = icon.endsWith('.png')
		? 'image/png'
		: icon.endsWith('.webp')
			? 'image/webp'
			: 'image/jpeg';
	return new Response(
		JSON.stringify({
			name: `Cozinha · ${name}`,
			short_name: 'Cozinha',
			lang: 'pt-BR',
			start_url: '/kitchen',
			scope: '/kitchen',
			display: 'fullscreen',
			orientation: 'landscape',
			background_color: dark,
			theme_color: dark,
			icons: branding.custom.icon ? [{ src: icon, sizes: 'any', type }] : DEFAULT_ICONS
		}),
		{
			headers: {
				'content-type': 'application/manifest+json',
				'cache-control': 'public, max-age=3600'
			}
		}
	);
};
