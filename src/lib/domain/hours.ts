// Opening hours in the shop's time zone. A day whose closing time is not after
// its opening time runs past midnight (18:00–02:00). Closed dates override the
// weekly schedule. With the schedule switched off the shop is always "in hours"
// and only the manual pause applies.
import { SHOP_TZ } from './time';

export interface DayHours {
	/** 0 = Sunday … 6 = Saturday. */
	weekday: number;
	/** "HH:MM", 24 h. */
	opens: string;
	closes: string;
}

export interface Schedule {
	enabled: boolean;
	days: DayHours[];
	/** Local dates the shop stays closed, "YYYY-MM-DD". */
	closedDates: string[];
}

export const WEEKDAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isTime = (s: string) => TIME_RE.test(s);

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

const partsFmt = new Intl.DateTimeFormat('en-CA', {
	timeZone: SHOP_TZ,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

function local(now: Date) {
	const p = Object.fromEntries(partsFmt.formatToParts(now).map((x) => [x.type, x.value]));
	const date = `${p.year}-${p.month}-${p.day}`;
	return { date, weekday: weekdayOf(date), minute: Number(p.hour) * 60 + Number(p.minute) };
}

function weekdayOf(date: string) {
	return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function shiftDate(date: string, days: number) {
	return new Date(new Date(`${date}T12:00:00Z`).getTime() + days * 86400_000)
		.toISOString()
		.slice(0, 10);
}

const crossesMidnight = (d: DayHours) => minutes(d.closes) <= minutes(d.opens);

export function isOpenAt(schedule: Schedule, now: Date): boolean {
	if (!schedule.enabled) return true;
	const { date, weekday, minute } = local(now);
	const closed = new Set(schedule.closedDates);
	for (const d of schedule.days.filter((x) => x.weekday === weekday)) {
		if (closed.has(date)) break;
		const o = minutes(d.opens);
		const c = minutes(d.closes);
		if (crossesMidnight(d) ? minute >= o : minute >= o && minute < c) return true;
	}
	// Yesterday's late shift still running after midnight.
	const yesterday = shiftDate(date, -1);
	if (closed.has(yesterday)) return false;
	return schedule.days.some(
		(d) => d.weekday === weekdayOf(yesterday) && crossesMidnight(d) && minute < minutes(d.closes)
	);
}

/** When the shop next opens, within a week: { date, opens }. Null if never. */
export function nextOpening(schedule: Schedule, now: Date): { date: string; opens: string } | null {
	if (!schedule.enabled) return null;
	const { date, minute } = local(now);
	const closed = new Set(schedule.closedDates);
	for (let i = 0; i <= 7; i++) {
		const day = shiftDate(date, i);
		if (closed.has(day)) continue;
		const starts = schedule.days
			.filter((d) => d.weekday === weekdayOf(day))
			.map((d) => d.opens)
			.filter((o) => i > 0 || minutes(o) > minute)
			.sort();
		if (starts.length) return { date: day, opens: starts[0] };
	}
	return null;
}

/** "hoje às 18:00", "amanhã às 11:30", "sexta às 18:00". */
export function describeOpening(next: { date: string; opens: string }, now: Date): string {
	const today = local(now).date;
	const when =
		next.date === today
			? 'hoje'
			: next.date === shiftDate(today, 1)
				? 'amanhã'
				: WEEKDAYS_PT[weekdayOf(next.date)].toLowerCase();
	return `${when} às ${next.opens}`;
}
