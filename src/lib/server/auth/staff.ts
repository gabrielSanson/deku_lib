import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import type { StaffRole } from '#lib/domain/order-status.ts';
import { currentShopId, db, type Db } from '../db';

export interface StaffSession {
	id: string;
	displayName: string;
	role: StaffRole;
	email: string | null;
}

export async function loadStaff(
	userId: string,
	email: string | null
): Promise<StaffSession | null> {
	const [row] = await db()<{ id: string; display_name: string; role: StaffRole }[]>`
		select user_id as id, display_name, role from shop_members
		where shop_id = ${currentShopId()} and user_id = ${userId} and active`;
	return row ? { id: row.id, displayName: row.display_name, role: row.role, email } : null;
}

/**
 * Makes a person a member of the current shop with this role (or updates them). staff_users keeps
 * one row per person for names in history; the role per shop lives in shop_members.
 */
export async function upsertMember(tx: Db, userId: string, displayName: string, role: StaffRole) {
	await tx`
		insert into shop_members (shop_id, user_id, display_name, role)
		values (${currentShopId()}, ${userId}, ${displayName}, ${role})
		on conflict (shop_id, user_id) do update set role = excluded.role,
			display_name = excluded.display_name, active = true`;
	await tx`
		insert into staff_users (id, display_name, role) values (${userId}, ${displayName}, ${role})
		on conflict (id) do update set display_name = excluded.display_name, active = true`;
}

/** Use in load functions and actions; enforces the role on the server. */
export function requireStaff(
	event: Pick<RequestEvent, 'locals' | 'url'>,
	roles?: StaffRole[]
): StaffSession {
	const staff = event.locals.staff;
	if (!staff) {
		// Signed in, but not part of this shop's team: show the shops they do work at.
		if (event.locals.authUserId) redirect(303, '/staff/lojas');
		redirect(303, `/staff/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}
	if (roles && !roles.includes(staff.role)) error(403, 'Seu perfil não tem acesso a esta área.');
	return staff;
}

/** Admins run the shop: menu, prices, settings, team and the till. */
export const ADMIN: StaffRole[] = ['admin'];
/** The counter: POS sales and payments. Attendants take them; reports and settings stay admin-only. */
export const COUNTER: StaffRole[] = ['admin', 'attendant'];

export function staffActor(staff: StaffSession) {
	return { type: 'staff' as const, id: staff.id, role: staff.role };
}
