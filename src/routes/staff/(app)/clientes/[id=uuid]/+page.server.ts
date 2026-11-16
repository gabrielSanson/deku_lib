import { error } from '@sveltejs/kit';
import { ADMIN, requireStaff } from '#lib/server/auth/staff.ts';
import { customerDetail } from '#lib/server/customers/list.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const customer = await customerDetail(event.params.id);
	if (!customer) error(404, { message: 'Cliente não encontrado' });
	return { customer };
};
