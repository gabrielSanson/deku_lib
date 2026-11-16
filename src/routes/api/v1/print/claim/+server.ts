// A paired kitchen screen asks for its next ticket. The station cookie is the credential.
import { error, json } from '@sveltejs/kit';
import { claimJob, STATION_COOKIE, stationByToken } from '#lib/server/printing/queue.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const station = await stationByToken(cookies.get(STATION_COOKIE));
	if (!station) error(401, 'Tela não pareada.');
	return json({ job: await claimJob(station) });
};
