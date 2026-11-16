// Nota fiscal → Exportar mês: the zip of the month's NFC-e XMLs and the CSV summary.
import { ADMIN, requireStaff } from '#lib/server/auth/staff.ts';
import { validMonth } from '#lib/server/expenses/service.ts';
import { exportMonth } from '#lib/server/fiscal/export.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	requireStaff(event, ADMIN);
	const month = validMonth(event.url.searchParams.get('mes'));
	const { zip } = await exportMonth(month);
	return new Response(new Uint8Array(zip), {
		headers: {
			'content-type': 'application/zip',
			'content-disposition': `attachment; filename="nfce-${month}.zip"`,
			'cache-control': 'no-store'
		}
	});
};
