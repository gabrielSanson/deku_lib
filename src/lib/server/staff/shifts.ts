// Equipe → Escala and Ponto (S5.8). The schedule is planned per week and published; people
// clock in and out on a shop device with their PIN. Hours are an internal control, not a
// certified electronic time clock.
import { SHOP_TZ } from '../analytics/queries';
import { audit, type Actor } from '../audit';
import { memberByPin } from '../auth/permissions';
import { currentShopId, db, type Db } from '../db';
import { DomainError } from '../errors';
import { rateLimit } from '../rate-limit';

/** Monday of the week containing this local date ("YYYY-MM-DD"). */
export function weekStart(day: string): string {
	const d = new Date(`${day}T12:00:00Z`);
	const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
	d.setUTCDate(d.getUTCDate() - dow);
	return d.toISOString().slice(0, 10);
}

export const today = (now = new Date()) =>
	new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TZ }).format(now);

export interface Shift {
	id: string;
	memberId: string;
	member: string;
	startsAt: Date;
	endsAt: Date;
	published: boolean;
}

export async function listShifts(monday: string, sql: Db = db()) {
	return sql<Shift[]>`
		select s.id, s.member_user_id as "memberId", m.display_name as member, s.starts_at as "startsAt",
			s.ends_at as "endsAt", s.published
		from work_shifts s join shop_members m on m.user_id = s.member_user_id and m.shop_id = s.shop_id
		where s.starts_at >= (${monday}::timestamp at time zone ${SHOP_TZ})
			and s.starts_at < ((${monday}::timestamp + interval '7 days') at time zone ${SHOP_TZ})
		order by s.starts_at, m.display_name`;
}

/** A shift on a local day, "HH:MM" to "HH:MM" (an end before the start runs past midnight). */
export async function addShift(
	i: { memberId: string; day: string; start: string; end: string },
	actor: Actor
) {
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(i.day) ||
		!/^\d{2}:\d{2}$/.test(i.start) ||
		!/^\d{2}:\d{2}$/.test(i.end)
	)
		throw new DomainError('err.shift.time');
	return db().begin(async (tx) => {
		const [m] = await tx`select 1 from shop_members where shop_id = ${currentShopId()}
			and user_id = ${i.memberId} and active`;
		if (!m) throw new DomainError('err.staff.notFound', { code: 'not_found', status: 404 });
		const [s] = await tx<{ id: string }[]>`
			insert into work_shifts (member_user_id, starts_at, ends_at)
			values (${i.memberId}, (${`${i.day} ${i.start}`}::timestamp at time zone ${SHOP_TZ}),
				((${`${i.day} ${i.end}`}::timestamp
					+ case when ${i.end}::time <= ${i.start}::time then interval '1 day' else interval '0' end)
					at time zone ${SHOP_TZ}))
			returning id`.catch(() => {
			throw new DomainError('err.shift.time');
		});
		await audit(tx, actor, 'shift.added', 'work_shift', s.id, { ...i });
		return s.id;
	});
}

export async function deleteShift(id: string, actor: Actor) {
	await db().begin(async (tx) => {
		await tx`delete from work_shifts where id = ${id}`;
		await audit(tx, actor, 'shift.deleted', 'work_shift', id, {});
	});
}

/** Publishes the week: the team sees it on the Ponto screen. */
export async function publishWeek(monday: string, actor: Actor) {
	await db().begin(async (tx) => {
		await tx`update work_shifts set published = true
			where starts_at >= (${monday}::timestamp at time zone ${SHOP_TZ})
				and starts_at < ((${monday}::timestamp + interval '7 days') at time zone ${SHOP_TZ})`;
		await audit(tx, actor, 'shift.week_published', 'work_shift', monday, {});
	});
}

/** Ponto: a PIN clocks the person in, or out when they are in. */
export async function clockByPin(pin: string, device: string | null, deviceKey: string) {
	if (!rateLimit(`ponto:${currentShopId()}:${deviceKey}`, 10, 5 * 60_000))
		throw new DomainError('err.pin.tooMany', { code: 'rate_limited', status: 429 });
	const member = await memberByPin(pin, null);
	if (!member) throw new DomainError('err.pin.wrong');
	return db().begin(async (tx) => {
		const [open] = await tx<{ id: string }[]>`
			update time_entries set clock_out_at = now()
			where member_user_id = ${member.id} and clock_out_at is null returning id`;
		if (open) {
			await audit(
				tx,
				{ type: 'staff', id: member.id },
				'time.clock_out',
				'time_entry',
				open.id,
				{}
			);
			return { name: member.name, action: 'out' as const };
		}
		const [e] = await tx<{ id: string }[]>`
			insert into time_entries (member_user_id, device) values (${member.id}, ${device?.slice(0, 80) ?? null})
			returning id`;
		await audit(tx, { type: 'staff', id: member.id }, 'time.clock_in', 'time_entry', e.id, {});
		return { name: member.name, action: 'in' as const };
	});
}

/** Fixes a forgotten clock-out (manager). */
export async function closeEntry(id: string, localAt: string, actor: Actor) {
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localAt)) throw new DomainError('err.shift.time');
	const at = localAt.replace('T', ' ');
	await db().begin(async (tx) => {
		const [e] = await tx<{ id: string }[]>`
			update time_entries set clock_out_at = (${at}::timestamp at time zone ${SHOP_TZ})
			where id = ${id} and clock_out_at is null
				and clock_in_at < (${at}::timestamp at time zone ${SHOP_TZ})
				and (${at}::timestamp at time zone ${SHOP_TZ}) <= now() returning id`;
		if (!e) throw new DomainError('err.shift.time');
		await audit(tx, actor, 'time.corrected', 'time_entry', id, { at: localAt });
	});
}

export interface WeekHours {
	memberId: string;
	member: string;
	scheduledMinutes: number;
	workedMinutes: number;
	/** Clock-ins without a clock-out after 16 hours: someone forgot. */
	missingOut: { id: string; clockInAt: Date }[];
}

export async function weeklyHours(monday: string, sql: Db = db()): Promise<WeekHours[]> {
	const rows = await sql<
		{ member_id: string; member: string; scheduled: number; worked: number }[]
	>`
		select m.user_id as member_id, m.display_name as member,
			coalesce((select sum(extract(epoch from s.ends_at - s.starts_at) / 60) from work_shifts s
				where s.member_user_id = m.user_id
					and s.starts_at >= (${monday}::timestamp at time zone ${SHOP_TZ})
					and s.starts_at < ((${monday}::timestamp + interval '7 days') at time zone ${SHOP_TZ})), 0)::int as scheduled,
			coalesce((select sum(extract(epoch from e.clock_out_at - e.clock_in_at) / 60) from time_entries e
				where e.member_user_id = m.user_id and e.clock_out_at is not null
					and e.clock_in_at >= (${monday}::timestamp at time zone ${SHOP_TZ})
					and e.clock_in_at < ((${monday}::timestamp + interval '7 days') at time zone ${SHOP_TZ})), 0)::int as worked
		from shop_members m where m.shop_id = ${currentShopId()} and m.active
		order by m.display_name`;
	const missing = await sql<{ id: string; member_id: string; clock_in_at: Date }[]>`
		select id, member_user_id as member_id, clock_in_at from time_entries
		where clock_out_at is null and clock_in_at < now() - interval '16 hours'`;
	return rows
		.map((r) => ({
			memberId: r.member_id,
			member: r.member,
			scheduledMinutes: r.scheduled,
			workedMinutes: r.worked,
			missingOut: missing
				.filter((x) => x.member_id === r.member_id)
				.map((x) => ({ id: x.id, clockInAt: x.clock_in_at }))
		}))
		.filter((r) => r.scheduledMinutes || r.workedMinutes || r.missingOut.length);
}

/** Who is clocked in now (shown on the Ponto screen). */
export async function clockedIn(sql: Db = db()) {
	return sql<{ member: string; since: Date }[]>`
		select m.display_name as member, e.clock_in_at as since from time_entries e
		join shop_members m on m.user_id = e.member_user_id and m.shop_id = e.shop_id
		where e.clock_out_at is null order by e.clock_in_at`;
}
