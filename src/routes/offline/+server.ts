// The page the service worker shows when a page can't load. It is cached by
// the service worker, so it is plain HTML with no scripts or app styles, and
// uses the owner's texts and colours from when it was last cached.
import { defaultBranding, DEFAULT_COLORS, getBranding } from '#lib/server/settings/branding.ts';
import { getTexts } from '#lib/server/settings/texts.ts';
import { defaultTexts } from '#lib/texts/catalog.ts';
import type { RequestHandler } from './$types';

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const GET: RequestHandler = async () => {
	const [texts, branding] = await Promise.all([
		getTexts().catch(() => defaultTexts()),
		getBranding().catch(() => defaultBranding())
	]);
	const primary = branding.colors.primary ?? DEFAULT_COLORS.primary;
	const background = branding.colors.background ?? DEFAULT_COLORS.background;
	const html = `<!doctype html>
<html lang="pt-BR">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${escape(texts['errors.offline.title'])}</title>
		<style>
			body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: ${background}; color: #141414; text-align: center; padding: 16px; }
			a { display: inline-block; padding: 12px 20px; border-radius: 999px; text-decoration: none; background: ${primary}; color: #000; font-weight: 700; }
		</style>
	</head>
	<body>
		<main>
			<h1>${escape(texts['errors.offline.title'])}</h1>
			<p>${escape(texts['errors.offline'])}</p>
			<a href="">${escape(texts['errors.retry'])}</a>
		</main>
	</body>
</html>`;
	return new Response(html, {
		headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
	});
};
