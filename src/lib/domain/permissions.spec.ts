import { describe, expect, it } from 'vitest';
import { defaultPermissions, isPermission, PERMISSIONS, SYSTEM_ROLES } from './permissions';

describe('permissions', () => {
	it('gives the owner everything and the kitchen almost nothing', () => {
		expect(defaultPermissions('admin')).toEqual([...PERMISSIONS]);
		expect(defaultPermissions('kitchen')).toEqual(['menu.availability']);
		expect(defaultPermissions('attendant')).toContain('pos.sell');
		expect(defaultPermissions('attendant')).not.toContain('orders.refund');
	});
	it('keeps team and money settings with the owner', () => {
		const gerente = SYSTEM_ROLES.find((r) => r.key === 'gerente')!;
		expect(gerente.permissions).not.toContain('staff.manage');
		expect(gerente.permissions).toContain('orders.refund');
	});
	it('recognises permission names', () => {
		expect(isPermission('menu.edit')).toBe(true);
		expect(isPermission('menu.delete')).toBe(false);
	});
});
