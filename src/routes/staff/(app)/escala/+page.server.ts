// Equipe → Escala: plan the week's shifts, publish them, and check worked hours (S5.8).
import { attempt, formString } from '#lib/server/actions.ts';
import { listStaff } from '#lib/server/auth/admin.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import {
	addShift,
	closeEntry,
	deleteShift,
	listShifts,
	publishWeek,
	today,
	weekStart,
	weeklyHours
} from '#lib/server/staff/shifts.ts';
import type { Actions, PageServerLoad } from './$types';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'staff.manage');
	const asked = event.url.searchParams.get('semana') ?? '';
	const monday = weekStart(DAY.test(asked) ? asked : today());
	const staff = await listStaff();
	return {
		monday,
		shifts: await listShifts(monday),
		hours: await weeklyHours(monday),
		members: staff.filter((m) => m.active).map((m) => ({ id: m.id, name: m.displayName }))
	};
};

export const actions: Actions = {
	add: async (event) => {
		const staff = requirePermission(event, 'staff.manage');
		const d = await event.request.formData();
		return attempt(async () => {
			await addShift(
				{
					memberId: formString(d, 'memberId'),
					day: formString(d, 'day'),
					start: formString(d, 'start'),
					end: formString(d, 'end')
				},
				staffActor(staff)
			);
			return { ok: true };
		});
	},
	delete: async (event) => {
		const staff = requirePermission(event, 'staff.manage');
		const id = formString(await event.request.formData(), 'id');
		return attempt(async () => {
			await deleteShift(id, staffActor(staff));
			return { ok: true };
		});
	},
	publish: async (event) => {
		const staff = requirePermission(event, 'staff.manage');
		const monday = formString(await event.request.formData(), 'monday');
		return attempt(async () => {
			await publishWeek(weekStart(monday), staffActor(staff));
			return { published: true };
		});
	},
	close: async (event) => {
		const staff = requirePermission(event, 'staff.manage');
		const d = await event.request.formData();
		return attempt(async () => {
			await closeEntry(formString(d, 'id'), formString(d, 'at'), staffActor(staff));
			return { ok: true };
		});
	}
};
