import { ADMIN, requireStaff } from '#lib/server/auth/staff.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	return {};
};
