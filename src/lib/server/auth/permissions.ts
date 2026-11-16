// Roles and permissions (S5.7), and the manager PIN: when an operator lacks a permission, a
// colleague who has it types their PIN and the action goes through, audited for both people.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { error, type RequestEvent } from '@sveltejs/kit';
import type { StaffRole } from '#lib/domain/order-status.ts';
import {
	isPermission,
	PERMISSIONS,
	SYSTEM_ROLES,
	type Permission
} from '#lib/domain/permissions.ts';
import { audit, type Actor } from '../audit';
import { currentShopId, db, type Db } from '../db';
import { DomainError } from '../errors';
import { rateLimit } from '../rate-limit';
import { requireStaff, staffActor, type StaffSession } from './staff';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

/** Use in loads and actions: the signed-in member must have this permission. */
export function requirePermission(
	event: Pick<RequestEvent, 'locals' | 'url'>,
	permission: Permission
): StaffSession {
	const staff = requireStaff(event);
	if (!staff.permissions.includes(permission)) error(403, 'Seu perfil não tem acesso a esta área.');
	return staff;
}

export const can = (staff: Pick<StaffSession, 'permissions'>, p: Permission) =>
	staff.permissions.includes(p);

/** Creates the four system roles for this shop when they are missing (idempotent). */
export async function ensureRoles(sql: Db = db()) {
	for (const r of SYSTEM_ROLES) {
		const [row] = await sql<{ id: string }[]>`
			insert into roles (name, system_key, base_role) values (${r.name}, ${r.key}, ${r.baseRole})
			on conflict (shop_id, system_key) where system_key is not null do nothing returning id`;
		if (row)
			for (const p of r.permissions)
				await sql`insert into role_permissions (role_id, permission) values (${row.id}, ${p})
					on conflict do nothing`;
	}
	// Members without a role get the system role of their base role.
	await sql`
		update shop_members m set role_id = r.id from roles r
		where m.shop_id = current_shop_id() and m.role_id is null and r.shop_id = m.shop_id
			and r.system_key = case m.role when 'admin' then 'dono' when 'attendant' then 'atendente' else 'cozinha' end`;
}

export interface RoleRow {
	id: string;
	name: string;
	systemKey: string | null;
	baseRole: StaffRole;
	permissions: Permission[];
	members: number;
}

export async function listRoles(sql: Db = db()): Promise<RoleRow[]> {
	await ensureRoles(sql);
	return sql<RoleRow[]>`
		select r.id, r.name, r.system_key as "systemKey", r.base_role as "baseRole",
			coalesce(array_agg(p.permission order by p.permission) filter (where p.permission is not null), '{}') as permissions,
			(select count(*)::int from shop_members m where m.role_id = r.id and m.active) as members
		from roles r left join role_permissions p on p.role_id = r.id
		group by r.id order by r.system_key is null, r.created_at`;
}

export async function createRole(name: string, baseRole: StaffRole, actor: Actor) {
	const clean = name.trim();
	if (!clean || clean.length > 40) throw new DomainError('err.role.name');
	if (!['admin', 'attendant', 'kitchen'].includes(baseRole))
		throw new DomainError('err.staff.role');
	return db().begin(async (tx) => {
		const [r] = await tx<{ id: string }[]>`
			insert into roles (name, base_role) values (${clean}, ${baseRole})
			on conflict (shop_id, name) do nothing returning id`;
		if (!r) throw new DomainError('err.role.duplicate');
		await audit(tx, actor, 'role.created', 'role', r.id, { name: clean, baseRole });
		return r.id;
	});
}

/** Replaces a role's permissions. The owner role ("Dono") always keeps everything. */
export async function saveRolePermissions(roleId: string, permissions: string[], actor: Actor) {
	const perms = [...new Set(permissions.filter(isPermission))];
	await db().begin(async (tx) => {
		const [r] = await tx<{ system_key: string | null }[]>`
			select system_key from roles where id = ${roleId} for update`;
		if (!r) throw new DomainError('err.role.notFound', { code: 'not_found', status: 404 });
		if (r.system_key === 'dono') throw new DomainError('err.role.owner');
		await tx`delete from role_permissions where role_id = ${roleId}`;
		for (const p of perms)
			await tx`insert into role_permissions (role_id, permission) values (${roleId}, ${p})`;
		await audit(tx, actor, 'role.permissions_saved', 'role', roleId, { permissions: perms });
	});
}

export async function deleteRole(roleId: string, actor: Actor) {
	await db().begin(async (tx) => {
		const [r] = await tx<{ system_key: string | null; members: number }[]>`
			select system_key, (select count(*)::int from shop_members where role_id = roles.id) as members
			from roles where id = ${roleId}`;
		if (!r) return;
		if (r.system_key) throw new DomainError('err.role.system');
		if (r.members) throw new DomainError('err.role.inUse');
		await tx`delete from roles where id = ${roleId}`;
		await audit(tx, actor, 'role.deleted', 'role', roleId, {});
	});
}

/** Gives a member a role; their base role (screens) follows the role. */
export async function assignRole(memberId: string, roleId: string, actor: StaffSession) {
	await db().begin(async (tx) => {
		const [r] = await tx<
			{ base_role: StaffRole }[]
		>`select base_role from roles where id = ${roleId}`;
		if (!r) throw new DomainError('err.role.notFound', { code: 'not_found', status: 404 });
		if (memberId === actor.id) throw new DomainError('err.staff.self', { code: 'self' });
		await tx`update shop_members set role_id = ${roleId}, role = ${r.base_role}
			where shop_id = ${currentShopId()} and user_id = ${memberId}`;
		// Someone active must still be able to manage the team.
		const [{ n }] = await tx<{ n: number }[]>`
			select count(*)::int as n from shop_members m
			where m.shop_id = ${currentShopId()} and m.active
				and (exists (select 1 from role_permissions p where p.role_id = m.role_id and p.permission = 'staff.manage')
					or (m.role_id is null and m.role = 'admin'))`;
		if (n === 0) throw new DomainError('err.staff.lastOwner', { code: 'last_owner' });
		await audit(tx, staffActor(actor), 'staff.role_assigned', 'staff_user', memberId, { roleId });
	});
}

// --- Manager PIN -----------------------------------------------------------------------------

async function hashPin(pin: string) {
	const salt = randomBytes(16);
	const key = await scrypt(pin, salt, 32);
	return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function pinMatches(pin: string, stored: string) {
	const [kind, salt, key] = stored.split('$');
	if (kind !== 'scrypt' || !salt || !key) return false;
	const expected = Buffer.from(key, 'base64');
	const got = await scrypt(pin, Buffer.from(salt, 'base64'), expected.length);
	return timingSafeEqual(expected, got);
}

/** Sets (or clears, with '') a member's 4–6 digit PIN. Members set their own; staff.manage any. */
export async function setPin(memberId: string, pin: string, actor: StaffSession) {
	if (memberId !== actor.id && !can(actor, 'staff.manage'))
		throw new DomainError('err.staff.cannotEdit', { code: 'forbidden', status: 403 });
	if (pin && !/^\d{4,6}$/.test(pin)) throw new DomainError('err.pin.format');
	const stored = pin ? await hashPin(pin) : null;
	await db().begin(async (tx) => {
		if (stored) {
			// Two people with the same PIN would make approvals ambiguous.
			const others = await tx<{ pin_hash: string }[]>`
				select pin_hash from shop_members where shop_id = ${currentShopId()}
					and user_id <> ${memberId} and pin_hash is not null and active`;
			for (const o of others)
				if (await pinMatches(pin, o.pin_hash)) throw new DomainError('err.pin.taken');
		}
		await tx`update shop_members set pin_hash = ${stored}
			where shop_id = ${currentShopId()} and user_id = ${memberId}`;
		await audit(tx, staffActor(actor), 'staff.pin_set', 'staff_user', memberId, { cleared: !pin });
	});
}

/** The active member (with this permission, when given) whose PIN this is, or null. */
export async function memberByPin(pin: string, permission: Permission | null, sql: Db = db()) {
	if (!/^\d{4,6}$/.test(pin)) return null;
	const rows = await sql<{ user_id: string; display_name: string; pin_hash: string }[]>`
		select m.user_id, m.display_name, m.pin_hash from shop_members m
		where m.shop_id = ${currentShopId()} and m.active and m.pin_hash is not null
			and (${permission}::text is null
				or exists (select 1 from role_permissions p where p.role_id = m.role_id and p.permission = ${permission})
				or (m.role_id is null and m.role = 'admin'))`;
	for (const r of rows)
		if (await pinMatches(pin, r.pin_hash)) return { id: r.user_id, name: r.display_name };
	return null;
}

/**
 * The operator may do this, or a manager approved it with their PIN. Throws 'needs_manager' so
 * the screen can ask for a PIN; wrong PINs are rate-limited per operator.
 */
export async function approve(
	staff: StaffSession,
	permission: Permission,
	pin: string | null | undefined,
	what: string
): Promise<{ approvedBy: string | null }> {
	if (can(staff, permission)) return { approvedBy: null };
	if (!pin)
		throw new DomainError('err.permission.needsManager', { code: 'needs_manager', status: 403 });
	if (!rateLimit(`pin:${currentShopId()}:${staff.id}`, 5, 10 * 60_000))
		throw new DomainError('err.pin.tooMany', { code: 'rate_limited', status: 429 });
	const manager = await memberByPin(pin, permission);
	if (!manager) throw new DomainError('err.pin.wrong', { code: 'needs_manager', status: 403 });
	await audit(db(), staffActor(staff), 'permission.approved', 'staff_user', manager.id, {
		permission,
		what,
		approvedBy: manager.id
	});
	return { approvedBy: manager.id };
}

export { PERMISSIONS };
