import { DEFAULT_COLORS, getBranding } from '#lib/server/settings/branding.ts';
import { shopName } from '#lib/server/settings/profile.ts';
import type { RequestHandler } from './$types';

const DEFAULT_ICONS = [
	{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
	{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
	{ src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
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
			name,
			short_name: name,
			lang: 'pt-BR',
			start_url: '/',
			scope: '/',
			display: 'standalone',
			background_color: dark,
			theme_color: dark,
			// An uploaded icon is used at every size; the owner is asked for a square image.
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
