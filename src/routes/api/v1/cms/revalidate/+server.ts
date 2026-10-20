// Called by the Directus Flow when an editor changes the menu. It only drops
// this instance's cache; other instances refresh within the 30 s cache window.
import { timingSafeEqual } from 'node:crypto';
import { config } from '#lib/server/config.ts';
import { invalidateCatalog } from '#lib/server/catalog/service.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const secret = config().CMS_WEBHOOK_SECRET;
	const given = request.headers.get('x-cms-secret') ?? '';
	if (
		!secret ||
		given.length !== secret.length ||
		!timingSafeEqual(Buffer.from(given), Buffer.from(secret))
	) {
		return new Response(null, { status: 401 });
	}
	invalidateCatalog();
	return new Response(null, { status: 204 });
};
