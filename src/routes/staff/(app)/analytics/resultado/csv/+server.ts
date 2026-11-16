// The month's result as CSV (semicolon, as Brazilian spreadsheets expect).
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { monthlyResult, validMonth } from '#lib/server/expenses/service.ts';
import { getTexts } from '#lib/server/settings/texts.ts';
import type { TextKey } from '#lib/texts/catalog.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	requirePermission(event, 'reports.view');
	const r = await monthlyResult(validMonth(event.url.searchParams.get('mes')));
	const texts = await getTexts();
	const rows = [
		['linha', 'valor'],
		...r.lines.map((l) => [
			texts[`dre.line.${l.key}` as TextKey] ?? l.key,
			(l.cents / 100).toFixed(2).replace('.', ',')
		])
	];
	const csv = rows
		.map((row) => row.map((c) => `"${c.replaceAll('"', '""')}"`).join(';'))
		.join('\r\n');
	return new Response(`\uFEFF${csv}\r\n`, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="resultado-${r.month}.csv"`
		}
	});
};
