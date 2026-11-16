import { error } from '@sveltejs/kit';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { customerDetail } from '#lib/server/customers/list.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'customers.view');
	const customer = await customerDetail(event.params.id);
	if (!customer) error(404, { message: 'Cliente não encontrado' });
	return { customer };
};
