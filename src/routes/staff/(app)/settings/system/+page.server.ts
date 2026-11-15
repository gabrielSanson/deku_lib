// Sistema: is the shop's server looking after itself? Backups now; alerts in the next step.
import { ADMIN, requireStaff } from '#lib/server/auth/staff.ts';
import { backupStatus } from '#lib/server/settings/system.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	return { backups: await backupStatus() };
};
