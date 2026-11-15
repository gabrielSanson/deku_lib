// Configurações → Sistema: are the backups working? Reads public.backup_runs, which the
// shop-backup container writes (deploy/backup).
import { backupStale, restoreTestStale } from '#lib/domain/health.ts';
import { db, type Db } from '../db';

export interface BackupRun {
	at: Date;
	ok: boolean;
	bytes: number | null;
	offsite: boolean;
	error: string | null;
	detail: Record<string, unknown>;
}

export interface BackupStatus {
	/** Newest dump, good or not. */
	lastDump: BackupRun | null;
	lastGoodDump: BackupRun | null;
	lastOffsite: BackupRun | null;
	lastRestoreTest: BackupRun | null;
	dumpStale: boolean;
	offsiteStale: boolean;
	restoreStale: boolean;
	/** RCLONE_REMOTE is unknown to the web app; an off-site copy ever made means it is set. */
	offsiteConfigured: boolean;
}

export async function backupStatus(now = new Date(), sql: Db = db()): Promise<BackupStatus> {
	const rows = await sql<
		{
			slot: string;
			at: Date;
			ok: boolean;
			bytes: string | null;
			offsite: boolean;
			error: string | null;
			detail: Record<string, unknown>;
		}[]
	>`
		select * from (
			(select 'last' as slot, coalesce(finished_at, started_at) as at, ok, bytes, offsite, error, detail
				from backup_runs where kind = 'dump' order by started_at desc limit 1)
			union all
			(select 'good', coalesce(finished_at, started_at), ok, bytes, offsite, error, detail
				from backup_runs where kind = 'dump' and ok order by started_at desc limit 1)
			union all
			(select 'offsite', coalesce(finished_at, started_at), ok, bytes, offsite, error, detail
				from backup_runs where kind = 'dump' and offsite order by started_at desc limit 1)
			union all
			(select 'restore', coalesce(finished_at, started_at), ok, bytes, offsite, error, detail
				from backup_runs where kind = 'restore_test' order by started_at desc limit 1)
		) s`;
	const pick = (slot: string): BackupRun | null => {
		const r = rows.find((x) => x.slot === slot);
		return r
			? {
					at: new Date(r.at),
					ok: r.ok,
					bytes: r.bytes === null ? null : Number(r.bytes),
					offsite: r.offsite,
					error: r.error,
					detail: r.detail
				}
			: null;
	};
	const lastGoodDump = pick('good');
	const lastOffsite = pick('offsite');
	const lastRestoreTest = pick('restore');
	return {
		lastDump: pick('last'),
		lastGoodDump,
		lastOffsite,
		lastRestoreTest,
		dumpStale: backupStale(lastGoodDump?.at ?? null, now),
		offsiteStale: backupStale(lastOffsite?.at ?? null, now),
		restoreStale: restoreTestStale(lastRestoreTest?.ok ? lastRestoreTest.at : null, now),
		offsiteConfigured: lastOffsite !== null
	};
}
