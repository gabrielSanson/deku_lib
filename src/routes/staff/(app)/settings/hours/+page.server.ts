import { attempt, failText, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { getSchedule, listClosures, saveSchedule } from '#lib/server/settings/hours.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const [schedule, closures] = await Promise.all([
		getSchedule(undefined, { fresh: true }),
		listClosures()
	]);
	return { schedule, closures };
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		let payload: unknown;
		try {
			payload = JSON.parse(formString(d, 'payload'));
		} catch {
			return failText(400, 'err.data.invalid');
		}
		return attempt(async () => {
			await saveSchedule(payload as Parameters<typeof saveSchedule>[0], staffActor(staff));
			return { ok: true };
		});
	}
};
