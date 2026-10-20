import { attempt } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { listTextsForEditor, saveTexts } from '#lib/server/settings/texts.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	return { groups: await listTextsForEditor() };
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const input: Record<string, string> = {};
		for (const [k, v] of d) if (k.startsWith('t:') && typeof v === 'string') input[k.slice(2)] = v;
		return attempt(async () => {
			await saveTexts(input, staffActor(staff));
			return { ok: true };
		});
	}
};
