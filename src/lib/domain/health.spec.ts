import { describe, expect, it } from 'vitest';
import { backupStale, restoreTestStale } from './health';

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
