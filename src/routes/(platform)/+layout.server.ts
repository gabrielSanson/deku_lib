// The hosted platform's own pages exist only on multi-shop installs.
import { error } from '@sveltejs/kit';
import { config } from '#lib/server/config.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const c = config();
	if (c.TENANCY !== 'multi' || locals.shop) error(404, 'Página não encontrada.');
	return { platformDomain: c.PLATFORM_DOMAIN ?? '' };
};
