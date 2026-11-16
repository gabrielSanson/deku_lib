import { requirePermission } from '#lib/server/auth/permissions.ts';
import { MENU_CSV_TEMPLATE } from '#lib/domain/menu-csv.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	requirePermission(event, 'menu.edit');
	return new Response(MENU_CSV_TEMPLATE, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': 'attachment; filename="cardapio-modelo.csv"'
		}
	});
};
