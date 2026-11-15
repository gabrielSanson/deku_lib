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
