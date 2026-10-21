import { fail } from '@sveltejs/kit';
import type { StaffRole } from '#lib/domain/order-status.ts';
import { attempt, formString } from '#lib/server/actions.ts';
import {
	createStaffAccount,
	linkExistingUser,
	listStaff,
	updateStaff
} from '#lib/server/auth/admin.ts';
import { ADMIN, requireStaff } from '#lib/server/auth/staff.ts';
import type { Actions, PageServerLoad } from './$types';

const ROLES: StaffRole[] = ['admin', 'attendant', 'kitchen'];

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	return { people: await listStaff(), canCreate: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) };
};

export const actions: Actions = {
	update: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const role = formString(d, 'role') as StaffRole;
		const active = formString(d, 'active');
		if (role && !ROLES.includes(role)) return fail(400, { error: 'Perfil inválido.' });
		return attempt(async () => {
			await updateStaff(staff, formString(d, 'id'), {
				role: role || undefined,
				active: active ? active === '1' : undefined
			});
			return { ok: true };
		});
	},
	add: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const role = formString(d, 'role') as StaffRole;
		if (!ROLES.includes(role)) return fail(400, { error: 'Perfil inválido.' });
		const email = formString(d, 'email');
		const displayName = formString(d, 'displayName');
		if (!email || !displayName) return fail(400, { error: 'Informe nome e e-mail.' });
		const password = formString(d, 'password');
		return attempt(async () => {
			if (password) await createStaffAccount(staff, { email, displayName, role, password });
			else await linkExistingUser(staff, email, displayName, role);
			return { ok: true, added: email };
		});
	}
};
