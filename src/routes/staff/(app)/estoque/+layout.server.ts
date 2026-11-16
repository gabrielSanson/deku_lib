import { requirePermission } from '#lib/server/auth/permissions.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	requirePermission(event, 'menu.edit');
	return {};
};
