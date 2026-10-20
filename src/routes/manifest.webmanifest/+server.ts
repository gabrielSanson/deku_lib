import { config } from '#lib/server/config.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const name = config().SHOP_NAME;
	return new Response(
		JSON.stringify({
			name,
			short_name: name,
			lang: 'pt-BR',
			start_url: '/',
			scope: '/',
			display: 'standalone',
			background_color: '#fafaf9',
			theme_color: '#ea580c',
			icons: [
				{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
				{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
				{ src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
			]
		}),
		{ headers: { 'content-type': 'application/manifest+json', 'cache-control': 'public, max-age=3600' } }
	);
};
