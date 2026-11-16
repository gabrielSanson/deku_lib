import type { StaffRole } from '#lib/domain/order-status.ts';
import { attempt, failText, formString } from '#lib/server/actions.ts';
import {
	createStaffAccount,
	linkExistingUser,
	listStaff,
	updateStaff
} from '#lib/server/auth/admin.ts';
import { assignRole, listRoles, requirePermission, setPin } from '#lib/server/auth/permissions.ts';
import type { Actions, PageServerLoad } from './$types';

const ROLES: StaffRole[] = ['admin', 'attendant', 'kitchen'];

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'staff.manage');
	const roles = await listRoles(); // also gives older members their standard role
	return {
		people: await listStaff(),
		roles: roles.map((r) => ({ id: r.id, name: r.name, baseRole: r.baseRole })),
		canCreate: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
	};
};

export const actions: Actions = {
	assign: async (event) => {
		const staff = requirePermission(event, 'staff.manage');
		const d = await event.request.formData();
		return attempt(async () => {
			await assignRole(formString(d, 'id'), formString(d, 'roleId'), staff);
			return { ok: true };
		});
	},
	pin: async (event) => {
		const staff = requirePermission(event, 'staff.manage');
		const d = await event.request.formData();
		return attempt(async () => {
			await setPin(formString(d, 'id'), formString(d, 'pin'), staff);
			return { pinSaved: true };
		});
	},
	update: async (event) => {
		const staff = requirePermission(event, 'staff.manage');
		const d = await event.request.formData();
		const role = formString(d, 'role') as StaffRole;
		const active = formString(d, 'active');
		if (role && !ROLES.includes(role)) return failText(400, 'err.staff.role');
		return attempt(async () => {
			await updateStaff(staff, formString(d, 'id'), {
				role: role || undefined,
				active: active ? active === '1' : undefined
			});
			return { ok: true };
		});
	},
	add: async (event) => {
		const staff = requirePermission(event, 'staff.manage');
		const d = await event.request.formData();
		const role = formString(d, 'role') as StaffRole;
		if (!ROLES.includes(role)) return failText(400, 'err.staff.role');
		const email = formString(d, 'email');
		const displayName = formString(d, 'displayName');
		if (!email || !displayName) return failText(400, 'err.staff.nameEmail');
		const password = formString(d, 'password');
		return attempt(async () => {
			if (password) await createStaffAccount(staff, { email, displayName, role, password });
			else await linkExistingUser(staff, email, displayName, role);
			return { ok: true, added: email };
		});
	}
};
