// Equipe → Ponto: anyone clocks in and out on this device with their PIN (S5.8).
import { attempt, formString } from '#lib/server/actions.ts';
import { requireStaff } from '#lib/server/auth/staff.ts';
import { clockByPin, clockedIn, listShifts, today, weekStart } from '#lib/server/staff/shifts.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event);
	const day = today();
	const shifts = (await listShifts(weekStart(day))).filter(
		(s) => s.published && today(s.startsAt) === day
	);
	return { clockedIn: await clockedIn(), shifts };
};

export const actions: Actions = {
	clock: async (event) => {
		const staff = requireStaff(event);
		const pin = formString(await event.request.formData(), 'pin');
		return attempt(async () => {
			const r = await clockByPin(
				pin,
				event.request.headers.get('user-agent'),
				`${staff.id}:${event.getClientAddress()}`
			);
			return { clocked: r };
		});
	}
};
