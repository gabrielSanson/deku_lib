import { randomUUID } from 'node:crypto';
import { db } from '#lib/server/db.ts';
import type { StaffRole } from '#lib/domain/order-status.ts';

export async function makeStaff(role: StaffRole, name = `${role} ${randomUUID().slice(0, 4)}`) {
	const sql = db();
	const [u] = await sql<
		{ id: string }[]
	>`insert into auth.users (email) values (${`${randomUUID()}@test.local`}) returning id`;
	await sql`insert into staff_users (id, display_name, role) values (${u.id}, ${name}, ${role})`;
	return { type: 'staff' as const, id: u.id, role };
}

export const classic = {
	sku: 'BRG-CLASSICO',
	quantity: 1,
	options: [{ groupId: 'ponto', sku: 'PONTO-AO' }]
};

/** Cash tenders need an open drawer; opens one unless a session is already open. */
export async function ensureCashOpen(actor: Awaited<ReturnType<typeof makeStaff>>) {
	const sql = db();
	const [open] = await sql`select id from cash_sessions where status = 'open'`;
	if (!open)
		await sql`insert into cash_sessions (opened_by, opening_float_cents) values (${actor.id}, 0)`;
}
