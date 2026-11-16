// The accountant's signed link to a month's NFC-e zip (sent on the 1st; valid 45 days).
import { error } from '@sveltejs/kit';
import { currentShopId } from '#lib/server/db.ts';
import { exportMonth, verifyExportToken } from '#lib/server/fiscal/export.ts';
import { clientKey, rateLimit } from '#lib/server/rate-limit.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	if (!rateLimit(`fiscal-export:${clientKey(event)}`, 10, 10 * 60_000))
		error(429, 'Muitas tentativas.');
	const month = verifyExportToken(event.params.token, currentShopId());
	if (!month) error(404, 'Link inválido ou vencido.');
	const { zip } = await exportMonth(month);
	return new Response(new Uint8Array(zip), {
		headers: {
			'content-type': 'application/zip',
			'content-disposition': `attachment; filename="nfce-${month}.zip"`,
			'cache-control': 'no-store',
			'x-robots-tag': 'noindex'
		}
	});
};
