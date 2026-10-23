// The blank preset's wordmark: the shop's name drawn as an SVG, so the header,
// the staff area and the sign-in pages show the name until the owner uploads one.
import { shopName } from '#lib/server/settings/profile.ts';
import type { RequestHandler } from './$types';

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const GET: RequestHandler = async () => {
	const name = await shopName().catch(() => '');
	const height = 48;
	// A rough width for bold sans text, so the picture keeps the name's proportions.
	const width = Math.max(height, Math.round(name.length * height * 0.58));
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><text x="0" y="${height * 0.78}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="${height * 0.82}" font-weight="800" fill="#ffffff">${escape(name)}</text></svg>`;
	return new Response(svg, {
		headers: {
			'content-type': 'image/svg+xml',
			'cache-control': 'public, max-age=300',
			'x-content-type-options': 'nosniff'
		}
	});
};
