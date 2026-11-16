import { attempt } from '#lib/server/actions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { listTextsForEditor, saveTexts } from '#lib/server/settings/texts.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'settings.edit');
	return { groups: await listTextsForEditor() };
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requirePermission(event, 'settings.edit');
		const d = await event.request.formData();
		const input: Record<string, string> = {};
		for (const [k, v] of d) if (k.startsWith('t:') && typeof v === 'string') input[k.slice(2)] = v;
		return attempt(async () => {
			await saveTexts(input, staffActor(staff));
			return { ok: true };
		});
	}
};
