// S5.8: the week's schedule and the PIN time clock. A shift ending before it starts runs past
// midnight; a PIN toggles in and out; forgotten clock-outs show up and a manager fixes them.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import { ensureRoles, setPin } from '#lib/server/auth/permissions.ts';
import { loadStaff, staffActor, type StaffSession } from '#lib/server/auth/staff.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import {
	addShift,
	clockByPin,
	clockedIn,
	closeEntry,
	deleteShift,
	listShifts,
	publishWeek,
	weekStart,
	weeklyHours
} from '#lib/server/staff/shifts.ts';
import { makeStaff } from './helpers.ts';

let owner: StaffSession;
let cook: StaffSession;
const monday = '2026-11-16';

beforeAll(async () => {
	const o = await makeStaff('admin');
	const c = await makeStaff('kitchen');
	await ensureRoles();
	owner = (await loadStaff(o.id!, null))!;
	cook = (await loadStaff(c.id!, null))!;
	await setPin(cook.id, '8642', owner);
});

afterAll(async () => {
	await db()`delete from time_entries where member_user_id = ${cook.id}`;
	await db()`delete from work_shifts where member_user_id = ${cook.id}`;
	await db()`update shop_members set pin_hash = null where user_id = ${cook.id}`;
	await stopBoss();
	await closeDb();
});

describe('shifts and time clock', () => {
	it('finds the Monday of a week', () => {
		expect(weekStart('2026-11-19')).toBe(monday);
		expect(weekStart('2026-11-16')).toBe(monday);
		expect(weekStart('2026-11-22')).toBe(monday);
	});

	it('plans, lists and publishes a week', async () => {
		const actor = staffActor(owner);
		const a = await addShift(
			{ memberId: cook.id, day: '2026-11-18', start: '18:00', end: '02:00' },
			actor
		);
		const b = await addShift(
			{ memberId: cook.id, day: '2026-11-19', start: '11:00', end: '15:00' },
			actor
		);
		await expect(
			addShift({ memberId: cook.id, day: '2026-11-19', start: '11h', end: '15:00' }, actor)
		).rejects.toThrow();
		const mine = (await listShifts(monday)).filter((s) => s.memberId === cook.id);
		expect(mine.map((s) => s.id)).toEqual([a, b]);
		expect(mine[0].endsAt.getTime() - mine[0].startsAt.getTime()).toBe(8 * 3600_000);
		expect(mine.every((s) => !s.published)).toBe(true);
		await publishWeek(monday, actor);
		expect((await listShifts(monday)).find((s) => s.id === a)?.published).toBe(true);
		const h = (await weeklyHours(monday)).find((r) => r.memberId === cook.id)!;
		expect(h.scheduledMinutes).toBe(12 * 60);
		await deleteShift(b, actor);
		expect((await listShifts(monday)).some((s) => s.id === b)).toBe(false);
		expect((await listShifts('2026-11-23')).some((s) => s.id === a)).toBe(false);
	});

	it('clocks in and out with a PIN', async () => {
		await expect(clockByPin('0000', null, 'test-wrong')).rejects.toThrow();
		const r1 = await clockByPin('8642', 'tablet', 'test');
		expect(r1).toEqual({ name: cook.displayName, action: 'in' });
		expect((await clockedIn()).some((c) => c.member === cook.displayName)).toBe(true);
		const r2 = await clockByPin('8642', 'tablet', 'test');
		expect(r2.action).toBe('out');
		expect((await clockedIn()).some((c) => c.member === cook.displayName)).toBe(false);
	});

	it('flags and fixes a forgotten clock-out', async () => {
		const [e] = await db()<{ id: string }[]>`
			insert into time_entries (member_user_id, clock_in_at)
			values (${cook.id}, now() - interval '20 hours') returning id`;
		const week = weekStart(
			new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
				new Date(Date.now() - 20 * 3600_000)
			)
		);
		const before = (await weeklyHours(week)).find((r) => r.memberId === cook.id)!;
		expect(before.missingOut.map((m) => m.id)).toEqual([e.id]);
		await expect(closeEntry(e.id, 'ontem', staffActor(owner))).rejects.toThrow();
		const local = new Intl.DateTimeFormat('sv-SE', {
			timeZone: 'America/Sao_Paulo',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		})
			.format(new Date(Date.now() - 12 * 3600_000))
			.replace(' ', 'T');
		await closeEntry(e.id, local, staffActor(owner));
		const after = (await weeklyHours(week)).find((r) => r.memberId === cook.id)!;
		expect(after.missingOut).toEqual([]);
	});
});
