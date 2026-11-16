// Staff account administration. Creating sign-in accounts needs the Supabase
// service-role key, which stays server-side and is optional: without it, owners
// create users in the Supabase dashboard and then assign a role here.
import { createClient } from '@supabase/supabase-js';
import type { StaffRole } from '#lib/domain/order-status.ts';
import { audit, type Actor } from '../audit';
import { currentShopId, db } from '../db';
import { DomainError } from '../errors';
import { supabaseServerUrl } from '../config';
import { upsertMember, type StaffSession } from './staff';

export interface StaffRow {
	id: string;
	displayName: string;
	role: StaffRole;
	active: boolean;
	email: string | null;
}

export async function listStaff(): Promise<StaffRow[]> {
	const rows = await db()<
		{ id: string; display_name: string; role: StaffRole; active: boolean; email: string | null }[]
	>`
		select m.user_id as id, m.display_name, m.role, m.active, u.email
		from shop_members m left join auth.users u on u.id = m.user_id
		where m.shop_id = ${currentShopId()}
		order by m.active desc, m.role, m.display_name`;
	return rows.map((r) => ({
		id: r.id,
		displayName: r.display_name,
		role: r.role,
		active: r.active,
		email: r.email
	}));
}

/** Only admins manage accounts. */
export function canManage(actor: StaffSession) {
	return actor.role === 'admin';
}

export async function updateStaff(
	actor: StaffSession,
	id: string,
	patch: { role?: StaffRole; active?: boolean; displayName?: string }
) {
	await db().begin(async (tx) => {
		const [target] = await tx<
			{ role: StaffRole }[]
		>`select role from shop_members where shop_id = ${currentShopId()} and user_id = ${id} for update`;
		if (!target) throw new DomainError('err.staff.notFound', { code: 'not_found', status: 404 });
		if (!canManage(actor)) {
			throw new DomainError('err.staff.cannotEdit', { code: 'forbidden', status: 403 });
		}
		if (id === actor.id && (patch.active === false || (patch.role && patch.role !== actor.role))) {
			throw new DomainError('err.staff.self', { code: 'self' });
		}
		if (
			target.role === 'admin' &&
			(patch.active === false || (patch.role && patch.role !== 'admin'))
		) {
			const [{ n }] = await tx<
				{ n: number }[]
			>`select count(*)::int n from shop_members where shop_id = ${currentShopId()} and role = 'admin' and active`;
			if (n <= 1) throw new DomainError('err.staff.lastOwner', { code: 'last_owner' });
		}
		await tx`
			update shop_members set
				role = coalesce(${patch.role ?? null}, role),
				active = coalesce(${patch.active ?? null}, active),
				display_name = coalesce(${patch.displayName ?? null}, display_name)
			where shop_id = ${currentShopId()} and user_id = ${id}`;
		if (patch.displayName) {
			await tx`update staff_users set display_name = ${patch.displayName} where id = ${id}`;
		}
		const a: Actor = { type: 'staff', id: actor.id };
		await audit(tx, a, 'staff.updated', 'staff_user', id, patch);
	});
}

export async function createStaffAccount(
	actor: StaffSession,
	input: { email: string; displayName: string; role: StaffRole; password: string }
) {
	if (!canManage(actor))
		throw new DomainError('err.staff.cannotCreate', { code: 'forbidden', status: 403 });
	if (input.password.length < 10) throw new DomainError('err.staff.password');
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	const url = supabaseServerUrl();
	if (!key || !url) {
		throw new DomainError('err.staff.noAdminKey', { code: 'no_admin_key', status: 501 });
	}
	const admin = createClient(url, key, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { data, error } = await admin.auth.admin.createUser({
		email: input.email,
		password: input.password,
		email_confirm: true
	});
	if (error || !data.user)
		throw new DomainError('err.staff.createFailed', { vars: { detail: error?.message ?? '' } });
	await db().begin(async (tx) => {
		await upsertMember(tx, data.user.id, input.displayName, input.role);
		await audit(tx, { type: 'staff', id: actor.id }, 'staff.created', 'staff_user', data.user.id, {
			email: input.email,
			role: input.role
		});
	});
}

/** Assigns a role to an existing Supabase Auth user (created in the dashboard). */
export async function linkExistingUser(
	actor: StaffSession,
	email: string,
	displayName: string,
	role: StaffRole
) {
	if (!canManage(actor))
		throw new DomainError('err.staff.cannotCreate', { code: 'forbidden', status: 403 });
	await db().begin(async (tx) => {
		const [u] = await tx<
			{ id: string }[]
		>`select id from auth.users where lower(email) = lower(${email})`;
		if (!u) throw new DomainError('err.staff.noAuthUser', { code: 'not_found', status: 404 });
		await upsertMember(tx, u.id, displayName, role);
		await audit(tx, { type: 'staff', id: actor.id }, 'staff.linked', 'staff_user', u.id, {
			email,
			role
		});
	});
}
