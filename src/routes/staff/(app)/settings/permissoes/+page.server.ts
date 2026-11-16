// Configurações → Permissões: what each role may do (S5.7).
import { attempt, formString } from '#lib/server/actions.ts';
import {
	createRole,
	deleteRole,
	listRoles,
	requirePermission,
	saveRolePermissions
} from '#lib/server/auth/permissions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import type { StaffRole } from '#lib/domain/order-status.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'staff.manage');
	return { roles: await listRoles() };
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requirePermission(event, 'staff.manage');
		const d = await event.request.formData();
		return attempt(async () => {
			await saveRolePermissions(
				formString(d, 'roleId'),
				d.getAll('permission').map(String),
				staffActor(staff)
			);
			return { saved: true };
		});
	},
	create: async (event) => {
		const staff = requirePermission(event, 'staff.manage');
		const d = await event.request.formData();
		return attempt(async () => {
			await createRole(
				formString(d, 'name'),
				formString(d, 'baseRole') as StaffRole,
				staffActor(staff)
			);
			return { created: true };
		});
	},
	delete: async (event) => {
		const staff = requirePermission(event, 'staff.manage');
		const id = formString(await event.request.formData(), 'roleId');
		return attempt(async () => {
			await deleteRole(id, staffActor(staff));
			return { deleted: true };
		});
	}
};
