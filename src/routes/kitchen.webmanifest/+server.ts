// Installable kitchen display: opens straight into the KDS, full screen, landscape.
import { shopName } from '#lib/server/settings/profile.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () =>
	new Response(
		JSON.stringify({
			name: `Cozinha · ${await shopName()}`,
			short_name: 'Cozinha',
			lang: 'pt-BR',
			start_url: '/kitchen',
			scope: '/kitchen',
			display: 'fullscreen',
			orientation: 'landscape',
			background_color: '#0c0a09',
			theme_color: '#0c0a09',
			icons: [
				{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
				{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
			]
		}),
		{
			headers: {
				'content-type': 'application/manifest+json',
				'cache-control': 'public, max-age=3600'
			}
		}
	);
