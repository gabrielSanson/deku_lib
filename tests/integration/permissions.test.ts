// S5.7: roles as permission sets and the manager PIN. System roles map the old accounts; the
// owner role always keeps everything; someone must keep "staff.manage"; a manager's PIN lets an
// attendant do what their role does not allow, audited for both.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import {
	approve,
	assignRole,
	createRole,
	deleteRole,
	ensureRoles,
	listRoles,
	memberByPin,
	saveRolePermissions,
	setPin
} from '#lib/server/auth/permissions.ts';
import { loadStaff, staffActor, type StaffSession } from '#lib/server/auth/staff.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { makeStaff } from './helpers.ts';

let owner: StaffSession;
let clerk: StaffSession;

beforeAll(async () => {
	const o = await makeStaff('admin');
	const c = await makeStaff('attendant');
	await ensureRoles();
	owner = (await loadStaff(o.id!, null))!;
	clerk = (await loadStaff(c.id!, null))!;
});

afterAll(async () => {
	await db()`update shop_members set pin_hash = null where user_id in (${owner.id}, ${clerk.id})`;
	await stopBoss();
	await closeDb();
});

describe('roles and permissions', () => {
	it('maps old accounts to the system roles', async () => {
		expect(owner.permissions).toContain('staff.manage');
		expect(clerk.permissions).toContain('pos.sell');
		expect(clerk.permissions).not.toContain('orders.refund');
		const names = (await listRoles()).map((r) => r.name);
		expect(names.slice(0, 4)).toEqual(['Dono', 'Gerente', 'Atendente', 'Cozinha']);
	});

	it('edits a custom role and protects the owner role', async () => {
		const roles = await listRoles();
		const dono = roles.find((r) => r.systemKey === 'dono')!;
		await expect(saveRolePermissions(dono.id, [], staffActor(owner))).rejects.toThrow();
		const id = await createRole(`Caixa ${Date.now()}`, 'attendant', staffActor(owner));
		await saveRolePermissions(id, ['pos.sell', 'pos.discount', 'nope'], staffActor(owner));
		const custom = (await listRoles()).find((r) => r.id === id)!;
		expect(custom.permissions).toEqual(['pos.discount', 'pos.sell']);
		await assignRole(clerk.id, id, owner);
		clerk = (await loadStaff(clerk.id, null))!;
		expect([...clerk.permissions].sort()).toEqual(['pos.discount', 'pos.sell']);
		await expect(deleteRole(id, staffActor(owner))).rejects.toThrow();
		const atendente = roles.find((r) => r.systemKey === 'atendente')!;
		await assignRole(clerk.id, atendente.id, owner);
		await deleteRole(id, staffActor(owner));
		await expect(assignRole(owner.id, atendente.id, owner)).rejects.toThrow();
	});

	it('lets a manager approve with their PIN, and only a manager', async () => {
		await expect(setPin(clerk.id, '12a4', owner)).rejects.toThrow();
		await setPin(owner.id, '4321', owner);
		await setPin(clerk.id, '1111', clerk);
		await expect(setPin(clerk.id, '4321', clerk)).rejects.toThrow();
		await expect(setPin(owner.id, '9999', clerk)).rejects.toThrow();

		expect((await memberByPin('4321', 'orders.refund'))?.id).toBe(owner.id);
		expect(await memberByPin('1111', 'orders.refund')).toBeNull();

		expect(await approve(owner, 'orders.refund', null, 'x')).toEqual({ approvedBy: null });
		await expect(approve(clerk, 'orders.refund', null, 'x')).rejects.toThrow();
		await expect(approve(clerk, 'orders.refund', '1111', 'x')).rejects.toThrow();
		expect(await approve(clerk, 'orders.refund', '4321', 'refund:t1')).toEqual({
			approvedBy: owner.id
		});
		const [a] = await db()<{ detail: { approvedBy: string } }[]>`
			select summary as detail from audit_log where action = 'permission.approved' and actor_id = ${clerk.id}
			order by created_at desc limit 1`;
		expect(a.detail.approvedBy).toBe(owner.id);
	});
});
