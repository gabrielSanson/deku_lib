// Readiness: the database answers and migrations have been applied. Also reports whether the
// worker checked in recently; that does not make the web app unready.
import { json } from '@sveltejs/kit';
import { workerDown } from '#lib/domain/health.ts';
import { db } from '#lib/server/db.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const [row] = await db()<{ ok: number; settings: number; worker_beat: Date | null }[]>`
			select 1 as ok, (select count(*)::int from store_runtime_settings) as settings,
				(select beat_at from system_heartbeats where name = 'worker') as worker_beat`;
		const ready = row.ok === 1 && row.settings === 1;
		const worker = { ok: !workerDown(row.worker_beat, new Date()), beatAt: row.worker_beat };
		return json(
			{ ready, db: 'ok', worker },
			{ status: ready ? 200 : 503, headers: { 'cache-control': 'no-store' } }
		);
	} catch {
		return json(
			{ ready: false, db: 'error' },
			{ status: 503, headers: { 'cache-control': 'no-store' } }
		);
	}
};
