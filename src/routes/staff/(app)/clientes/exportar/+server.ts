// CSV of the customer list. "marketing" holds only contacts who may receive offers; "delivery"
// holds everyone, without phone or e-mail.
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { audit } from '#lib/server/audit.ts';
import { customersCsv, type CustomerFilter } from '#lib/server/customers/list.ts';
import { db } from '#lib/server/db.ts';
import type { CustomerSource } from '#lib/domain/consent.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const staff = requirePermission(event, 'customers.export');
	const p = event.url.searchParams;
	const purpose = p.get('finalidade') === 'marketing' ? 'marketing' : 'delivery';
	const csv = await customersCsv(purpose, {
		q: p.get('q') ?? '',
		filter: (p.get('filtro') as CustomerFilter) || 'all',
		source: (p.get('origem') as CustomerSource) || ''
	});
	await audit(db(), staffActor(staff), 'customers.exported', 'customers', null, { purpose });
	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="clientes-${purpose}.csv"`
		}
	});
};
