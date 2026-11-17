// Platform console → Erros (S5.11): problems from the web app, the worker and browsers, newest first.
import { formString } from '#lib/server/actions.ts';
import {
	clearErrorGroup,
	listErrorGroups,
	type ErrorWhere
} from '#lib/server/monitoring/errors.ts';
import { requirePlatformAdmin } from '#lib/server/platform/admins.ts';
import type { Actions, PageServerLoad } from './$types';

const WHERE: ErrorWhere[] = ['web', 'worker', 'client'];

export const load: PageServerLoad = async (event) => {
	requirePlatformAdmin(event);
	const w = event.url.searchParams.get('onde') as ErrorWhere | null;
	const where = w && WHERE.includes(w) ? w : undefined;
	return { where: where ?? null, errors: await listErrorGroups({ where }) };
};

export const actions: Actions = {
	clear: async (event) => {
		requirePlatformAdmin(event);
		await clearErrorGroup(formString(await event.request.formData(), 'id'));
		return { cleared: true };
	}
};
