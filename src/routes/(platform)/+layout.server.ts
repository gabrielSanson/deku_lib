// The hosted platform's own pages exist only on multi-shop installs.
import { error } from '@sveltejs/kit';
import { config } from '#lib/server/config.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const c = config();
	if (c.TENANCY !== 'multi') error(404, 'Página não encontrada.');
	return { platformDomain: c.PLATFORM_DOMAIN ?? '' };
};
