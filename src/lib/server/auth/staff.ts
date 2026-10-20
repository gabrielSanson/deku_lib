import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import type { StaffRole } from '#lib/domain/order-status.ts';
import { db } from '../db';

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
		select id, display_name, role from staff_users where id = ${userId} and active`;
	return row ? { id: row.id, displayName: row.display_name, role: row.role, email } : null;
}

/** Use in load functions and actions; enforces the role on the server. */
export function requireStaff(
	event: Pick<RequestEvent, 'locals' | 'url'>,
	roles?: StaffRole[]
): StaffSession {
	const staff = event.locals.staff;
	if (!staff) {
		redirect(303, `/staff/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}
	if (roles && !roles.includes(staff.role)) error(403, 'Seu perfil não tem acesso a esta área.');
	return staff;
}

export const MANAGERS: StaffRole[] = ['owner', 'manager'];
export const FRONT_OF_HOUSE: StaffRole[] = ['owner', 'manager', 'cashier'];

export function staffActor(staff: StaffSession) {
	return { type: 'staff' as const, id: staff.id, role: staff.role };
}
