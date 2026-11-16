// The customer's data for an access request, as a JSON download.
import { error, json } from '@sveltejs/kit';
import { audit } from '#lib/server/audit.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { exportCustomerData } from '#lib/server/customers/privacy.ts';
import { db } from '#lib/server/db.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const staff = requirePermission(event, 'customers.export');
	const [r] = await db()<{ customer_id: string | null }[]>`
		select customer_id from privacy_requests where id = ${event.params.id}`;
	if (!r?.customer_id) error(404, { message: 'Sem cadastro' });
	const data = await exportCustomerData(r.customer_id);
	await audit(db(), staffActor(staff), 'privacy.exported', 'privacy_request', event.params.id, {});
	return json(data, {
		headers: {
			'content-disposition': `attachment; filename="dados-cliente-${event.params.id}.json"`
		}
	});
};
