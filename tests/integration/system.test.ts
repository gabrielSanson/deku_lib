import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { backupStatus } from '#lib/server/settings/system.ts';

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

describe('backup status', () => {
	it('is red with no backups, green after a good dump and restore test', async () => {
		await db()`delete from backup_runs`;
		const now = new Date();
		let s = await backupStatus(now);
		expect(s.dumpStale && s.offsiteStale && s.restoreStale).toBe(true);
		expect(s.lastDump).toBeNull();

		await db()`insert into backup_runs (kind, started_at, finished_at, ok, bytes, offsite)
			values ('dump', now() - interval '30 hours', now() - interval '30 hours', true, 1000, true),
				('dump', now() - interval '2 hours', now() - interval '2 hours', true, 2048, false)`;
		await db()`insert into backup_runs (kind, finished_at, ok, detail)
			values ('restore_test', now(), true, '{"orders": 12}')`;
		s = await backupStatus(now);
		expect(s.dumpStale).toBe(false);
		expect(s.lastDump?.bytes).toBe(2048);
		// The only off-site copy is 30 hours old.
		expect(s.offsiteConfigured).toBe(true);
		expect(s.offsiteStale).toBe(true);
		expect(s.restoreStale).toBe(false);
		expect(s.lastRestoreTest?.detail.orders).toBe(12);
	});

	it('keeps the last good dump when the newest one failed', async () => {
		await db()`insert into backup_runs (kind, ok, error) values ('dump', false, 'pg_dump: disk full')`;
		const s = await backupStatus();
		expect(s.lastDump?.ok).toBe(false);
		expect(s.lastDump?.error).toMatch(/disk full/);
		expect(s.lastGoodDump?.ok).toBe(true);
		expect(s.dumpStale).toBe(false);
	});
});
