// The platform console: only on multi-shop installs, only on the platform's own domain.
import { error } from '@sveltejs/kit';
import { config } from '#lib/server/config.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (config().TENANCY !== 'multi' || locals.shop) error(404, 'Página não encontrada.');
	return { admin: locals.platformAdmin };
};
