import { describe, expect, it } from 'vitest';
import { describeOpening, isOpenAt, nextOpening, type Schedule } from './hours';

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
