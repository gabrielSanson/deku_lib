import { describe, expect, it } from 'vitest';
import {
	describeOpening,
	isOpenAt,
	isSlot,
	nextOpening,
	slots,
	summaryDueAt,
	type Schedule
} from './hours';

// São Paulo is UTC-3 all year.
const at = (local: string) => new Date(`${local}:00-03:00`);

// 2026-10-20 is a Tuesday.
const schedule: Schedule = {
	enabled: true,
	days: [
		{ weekday: 2, opens: '11:00', closes: '15:00' },
		{ weekday: 2, opens: '18:00', closes: '23:00' },
		{ weekday: 5, opens: '18:00', closes: '02:00' }
	],
	closedDates: []
};

describe('opening hours', () => {
	it('follows the weekly schedule, including split shifts', () => {
		expect(isOpenAt(schedule, at('2026-10-20T10:59'))).toBe(false);
		expect(isOpenAt(schedule, at('2026-10-20T11:00'))).toBe(true);
		expect(isOpenAt(schedule, at('2026-10-20T16:00'))).toBe(false);
		expect(isOpenAt(schedule, at('2026-10-20T22:59'))).toBe(true);
		expect(isOpenAt(schedule, at('2026-10-20T23:00'))).toBe(false);
	});

	it('runs late shifts past midnight', () => {
		expect(isOpenAt(schedule, at('2026-10-23T23:30'))).toBe(true);
		expect(isOpenAt(schedule, at('2026-10-24T01:59'))).toBe(true);
		expect(isOpenAt(schedule, at('2026-10-24T02:00'))).toBe(false);
	});

	it('stays closed on closed dates', () => {
		const holiday = { ...schedule, closedDates: ['2026-10-23'] };
		expect(isOpenAt(holiday, at('2026-10-23T20:00'))).toBe(false);
		expect(isOpenAt(holiday, at('2026-10-24T01:00'))).toBe(false);
	});

	it('is always in hours when the schedule is off', () => {
		expect(isOpenAt({ ...schedule, enabled: false }, at('2026-10-21T04:00'))).toBe(true);
	});

	it('says when the shop opens next', () => {
		const now = at('2026-10-20T16:00');
		expect(nextOpening(schedule, now)).toEqual({ date: '2026-10-20', opens: '18:00' });
		expect(describeOpening(nextOpening(schedule, now)!, now)).toBe('hoje às 18:00');
		const late = at('2026-10-20T23:30');
		expect(describeOpening(nextOpening(schedule, late)!, late)).toBe('sexta às 18:00');
	});
});

describe('scheduling slots', () => {
	const hhmm = (d: Date) =>
		new Intl.DateTimeFormat('pt-BR', {
			timeZone: 'America/Sao_Paulo',
			weekday: 'short',
			hour: '2-digit',
			minute: '2-digit'
		}).format(d);

	it('offers every 15 min from now plus prep to the end of the next opening day', () => {
		// Tuesday 12:07, 20 min prep: first slot 12:30; today until 22:45, then Friday 18:00–01:45.
		const s = slots(schedule, at('2026-10-20T12:07'), 20);
		expect(s[0]).toEqual(at('2026-10-20T12:30'));
		expect(s).toContainEqual(at('2026-10-20T14:45'));
		expect(s).not.toContainEqual(at('2026-10-20T15:00'));
		expect(s).toContainEqual(at('2026-10-20T18:00'));
		expect(s).toContainEqual(at('2026-10-20T22:45'));
		expect(s).not.toContainEqual(at('2026-10-20T23:00'));
		expect(s).toContainEqual(at('2026-10-23T18:00'));
		expect(hhmm(s[s.length - 1])).toContain('01:45');
		expect(s.every((d) => d.getTime() % (15 * 60_000) === 0)).toBe(true);
	});

	it('while closed, starts at the next opening and stops after the day after', () => {
		const s = slots(schedule, at('2026-10-20T23:30'), 20);
		expect(s[0]).toEqual(at('2026-10-23T18:00'));
		expect(s[s.length - 1]).toEqual(at('2026-10-24T01:45'));
	});

	it('late shift past midnight counts as the day it began', () => {
		const s = slots(schedule, at('2026-10-24T00:10'), 15);
		expect(s[0]).toEqual(at('2026-10-24T00:30'));
		// Friday's shift, then the next opening day (Tuesday).
		expect(s).toContainEqual(at('2026-10-27T11:00'));
		expect(s[s.length - 1]).toEqual(at('2026-10-27T22:45'));
	});

	it('skips closed dates and checks a picked slot', () => {
		const closed = { ...schedule, closedDates: ['2026-10-23'] };
		const s = slots(closed, at('2026-10-20T23:30'), 20);
		expect(s[0]).toEqual(at('2026-10-27T11:00'));
		expect(isSlot(schedule, at('2026-10-20T12:07'), 20, at('2026-10-20T12:30'))).toBe(true);
		expect(isSlot(schedule, at('2026-10-20T12:07'), 20, at('2026-10-20T12:20'))).toBe(false);
		expect(isSlot(schedule, at('2026-10-20T12:07'), 20, at('2026-10-20T16:00'))).toBe(false);
	});

	it('with the schedule off, offers the rest of today and tomorrow', () => {
		const s = slots({ enabled: false, days: [], closedDates: [] }, at('2026-10-20T22:00'), 30);
		expect(s[0]).toEqual(at('2026-10-20T22:30'));
		expect(s[s.length - 1]).toEqual(at('2026-10-21T23:45'));
	});
});

describe('daily summary time', () => {
	it('is 30 min after the last closing, or 23:30', () => {
		expect(summaryDueAt(schedule, '2026-10-20')).toEqual(at('2026-10-20T23:30'));
		// Friday's shift closes at 02:00 on Saturday.
		expect(summaryDueAt(schedule, '2026-10-23')).toEqual(at('2026-10-24T02:30'));
		// Monday: closed all day.
		expect(summaryDueAt(schedule, '2026-10-19')).toEqual(at('2026-10-19T23:30'));
		const early = { ...schedule, days: [{ weekday: 2, opens: '11:00', closes: '15:00' }] };
		expect(summaryDueAt(early, '2026-10-20')).toEqual(at('2026-10-20T15:30'));
	});
});
