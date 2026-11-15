// Pure rules for "is the system healthy": backups, the worker, the iFood poll, orders arriving.
// The watchdog and Configurações → Sistema use them; keeping them here makes them testable.

const HOUR = 3_600_000;

/** A dump should exist every night; after 26 h without a good one the backups are failing. */
export function backupStale(lastOk: Date | null, now: Date): boolean {
	return !lastOk || now.getTime() - lastOk.getTime() > 26 * HOUR;
}

/** The weekly restore test should pass at least every 8 days. */
export function restoreTestStale(lastOk: Date | null, now: Date): boolean {
	return !lastOk || now.getTime() - lastOk.getTime() > 8 * 24 * HOUR;
}

const MINUTE = 60_000;

/** The worker checks in every minute; three missed beats means it stopped. */
export function workerDown(beatAt: Date | null, now: Date): boolean {
	return !beatAt || now.getTime() - beatAt.getTime() > 3 * MINUTE;
}

/** iFood is polled every 30 s; five minutes without a good poll while open loses orders. */
export function ifoodPollStale(
	lastOk: Date | null,
	now: Date,
	opts: { enabled: boolean; open: boolean }
): boolean {
	if (!opts.enabled || !opts.open) return false;
	return !lastOk || now.getTime() - lastOk.getTime() > 5 * MINUTE;
}

/**
 * Open and taking orders, normally busy at this hour (two or more orders an hour on the same
 * weekday and hour over the last four weeks), and nothing for `thresholdMinutes`: something is
 * probably broken (site down, iFood disconnected, internet out).
 */
export function noOrdersSuspicious(input: {
	openNow: boolean;
	minutesSinceLastOrder: number | null;
	expectedPerHour: number;
	thresholdMinutes: number;
}): boolean {
	if (!input.openNow || input.expectedPerHour < 2) return false;
	return (
		input.minutesSinceLastOrder === null || input.minutesSinceLastOrder >= input.thresholdMinutes
	);
}

/** An open alert is repeated every 30 minutes, never more often. */
export function alertDue(lastNotifiedAt: Date | null, now: Date): boolean {
	return !lastNotifiedAt || now.getTime() - lastNotifiedAt.getTime() >= 30 * MINUTE;
}
