import { requirePlatformAdmin } from '#lib/server/platform/admins.ts';
import { listShops } from '#lib/server/platform/console.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePlatformAdmin(event);
	return { shops: await listShops() };
};
