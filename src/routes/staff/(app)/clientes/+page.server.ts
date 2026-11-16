// Clientes: the contact list with filters; admins only.
import { ADMIN, requireStaff } from '#lib/server/auth/staff.ts';
import { listCustomers, type CustomerFilter } from '#lib/server/customers/list.ts';
import type { CustomerSource } from '#lib/domain/consent.ts';
import type { PageServerLoad } from './$types';

const FILTERS: CustomerFilter[] = ['all', 'inactive', 'frequent', 'new'];
const SOURCES: CustomerSource[] = ['own', 'pos', 'whatsapp', 'ifood', 'opendelivery'];

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const p = event.url.searchParams;
	const filter = FILTERS.find((f) => f === p.get('filtro')) ?? 'all';
	const source = SOURCES.find((s) => s === p.get('origem')) ?? '';
	const q = (p.get('q') ?? '').slice(0, 80);
	return {
		customers: await listCustomers({ q, filter, source }),
		filter,
		source,
		q,
		filters: FILTERS,
		sources: SOURCES
	};
};
