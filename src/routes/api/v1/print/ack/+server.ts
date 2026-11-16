// The screen printed the ticket (ok) or the print failed; a failed job goes back to the queue.
import { error, json } from '@sveltejs/kit';
import { ackJob, STATION_COOKIE, stationByToken } from '#lib/server/printing/queue.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	const station = await stationByToken(cookies.get(STATION_COOKIE));
	if (!station) error(401, 'Tela não pareada.');
	const body = (await request.json().catch(() => null)) as {
		jobId?: unknown;
		ok?: unknown;
		error?: unknown;
	} | null;
	if (typeof body?.jobId !== 'string' || !/^[0-9a-f-]{36}$/.test(body.jobId))
		error(400, 'Pedido inválido.');
	const done = await ackJob(
		station,
		body.jobId,
		body.ok === true,
		typeof body.error === 'string' ? body.error : null
	);
	return json({ ok: done });
};
