import { describe, expect, it } from 'vitest';
import {
	alertDue,
	backupStale,
	ifoodPollStale,
	noOrdersSuspicious,
	restoreTestStale,
	workerDown
} from './health';

const now = new Date('2026-11-15T12:00:00Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe('backupStale', () => {
	it('is stale with no successful dump at all', () => {
		expect(backupStale(null, now)).toBe(true);
	});
	it('is fine up to 26 hours after the last good dump', () => {
		expect(backupStale(hoursAgo(25), now)).toBe(false);
		expect(backupStale(hoursAgo(26), now)).toBe(false);
		expect(backupStale(hoursAgo(26.1), now)).toBe(true);
	});
});

describe('restoreTestStale', () => {
	it('allows a week and a day between restore tests', () => {
		expect(restoreTestStale(hoursAgo(7 * 24), now)).toBe(false);
		expect(restoreTestStale(hoursAgo(8 * 24 + 1), now)).toBe(true);
		expect(restoreTestStale(null, now)).toBe(true);
	});
});

const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000);

describe('workerDown', () => {
	it('allows three minutes between beats', () => {
		expect(workerDown(minsAgo(2), now)).toBe(false);
		expect(workerDown(minsAgo(3), now)).toBe(false);
		expect(workerDown(minsAgo(3.5), now)).toBe(true);
		expect(workerDown(null, now)).toBe(true);
	});
});

describe('ifoodPollStale', () => {
	it('only matters while iFood is on and the shop is open', () => {
		expect(ifoodPollStale(minsAgo(10), now, { enabled: false, open: true })).toBe(false);
		expect(ifoodPollStale(minsAgo(10), now, { enabled: true, open: false })).toBe(false);
		expect(ifoodPollStale(minsAgo(4), now, { enabled: true, open: true })).toBe(false);
		expect(ifoodPollStale(minsAgo(6), now, { enabled: true, open: true })).toBe(true);
		expect(ifoodPollStale(null, now, { enabled: true, open: true })).toBe(true);
	});
});

describe('noOrdersSuspicious', () => {
	const base = {
		openNow: true,
		minutesSinceLastOrder: 61,
		expectedPerHour: 3,
		thresholdMinutes: 60
	};
	it('fires on a normally busy hour with nothing for the threshold', () => {
		expect(noOrdersSuspicious(base)).toBe(true);
		expect(noOrdersSuspicious({ ...base, minutesSinceLastOrder: null })).toBe(true);
	});
	it('stays quiet when closed, on a quiet hour or with a recent order', () => {
		expect(noOrdersSuspicious({ ...base, openNow: false })).toBe(false);
		expect(noOrdersSuspicious({ ...base, expectedPerHour: 1.75 })).toBe(false);
		expect(noOrdersSuspicious({ ...base, minutesSinceLastOrder: 20 })).toBe(false);
	});
});

describe('alertDue', () => {
	it('repeats every 30 minutes at most', () => {
		expect(alertDue(null, now)).toBe(true);
		expect(alertDue(minsAgo(29), now)).toBe(false);
		expect(alertDue(minsAgo(30), now)).toBe(true);
	});
});
