// Fine-grained permissions (S5.7). Each member has a role; a role is a set of permissions. The
// four system roles map today's admin / attendant / kitchen accounts. Shared with the browser
// (nav filtering), so no server imports here.
import type { StaffRole } from './order-status';

export const PERMISSIONS = [
	'pos.sell',
	'pos.discount',
	'orders.cancel_paid',
	'orders.refund',
	'cash.open_close',
	'cash.adjust',
	'menu.edit',
	'menu.availability',
	'reports.view',
	'finance.edit',
	'fiscal.manage',
	'staff.manage',
	'settings.edit',
	'customers.view',
	'customers.export'
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const isPermission = (p: string): p is Permission =>
	(PERMISSIONS as readonly string[]).includes(p);

export interface SystemRole {
	key: 'dono' | 'gerente' | 'atendente' | 'cozinha';
	name: string;
	/** Which screens the account lands on (kitchen accounts only see the kitchen). */
	baseRole: StaffRole;
	permissions: readonly Permission[];
}

const ALL = PERMISSIONS;

export const SYSTEM_ROLES: SystemRole[] = [
	{ key: 'dono', name: 'Dono', baseRole: 'admin', permissions: ALL },
	{
		key: 'gerente',
		name: 'Gerente',
		baseRole: 'admin',
		permissions: ALL.filter(
			(p) => p !== 'staff.manage' && p !== 'fiscal.manage' && p !== 'finance.edit'
		)
	},
	{
		key: 'atendente',
		name: 'Atendente',
		baseRole: 'attendant',
		permissions: ['pos.sell', 'cash.open_close', 'menu.availability']
	},
	{ key: 'cozinha', name: 'Cozinha', baseRole: 'kitchen', permissions: ['menu.availability'] }
];

/** Permissions for an account without a role row yet (old installs): from its legacy role. */
export function defaultPermissions(role: StaffRole): Permission[] {
	const key = role === 'admin' ? 'dono' : role === 'attendant' ? 'atendente' : 'cozinha';
	return [...SYSTEM_ROLES.find((r) => r.key === key)!.permissions];
}
