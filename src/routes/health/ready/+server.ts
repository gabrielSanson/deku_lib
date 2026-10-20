// Readiness: the database answers and migrations have been applied.
import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const [row] = await db()<{ ok: number; settings: number }[]>`
			select 1 as ok, (select count(*)::int from store_runtime_settings) as settings`;
		const ready = row.ok === 1 && row.settings === 1;
		return json(
			{ ready, db: 'ok' },
			{ status: ready ? 200 : 503, headers: { 'cache-control': 'no-store' } }
		);
	} catch {
		return json(
			{ ready: false, db: 'error' },
			{ status: 503, headers: { 'cache-control': 'no-store' } }
		);
	}
};
