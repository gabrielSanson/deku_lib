// Staff account administration. Creating sign-in accounts needs the Supabase
// service-role key, which stays server-side and is optional: without it, owners
// create users in the Supabase dashboard and then assign a role here.
import { createClient } from '@supabase/supabase-js';
import type { StaffRole } from '#lib/domain/order-status.ts';
import { audit, type Actor } from '../audit';
import { db } from '../db';
import { DomainError } from '../errors';
import { config } from '../config';
import type { StaffSession } from './staff';

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
		select s.id, s.display_name, s.role, s.active, u.email
		from staff_users s left join auth.users u on u.id = s.id
		order by s.active desc, s.role, s.display_name`;
	return rows.map((r) => ({
		id: r.id,
		displayName: r.display_name,
		role: r.role,
		active: r.active,
		email: r.email
	}));
}

/** Managers handle cashier/kitchen accounts; only owners touch owner/manager accounts. */
export function canManage(actor: StaffSession, targetRole: StaffRole) {
	if (actor.role === 'owner') return true;
	return actor.role === 'manager' && (targetRole === 'cashier' || targetRole === 'kitchen');
}

export async function updateStaff(
	actor: StaffSession,
	id: string,
	patch: { role?: StaffRole; active?: boolean; displayName?: string }
) {
	await db().begin(async (tx) => {
		const [target] = await tx<
			{ role: StaffRole }[]
		>`select role from staff_users where id = ${id} for update`;
		if (!target) throw new DomainError('Pessoa não encontrada.', 'not_found', 404);
		if (!canManage(actor, target.role) || (patch.role && !canManage(actor, patch.role))) {
			throw new DomainError('Seu perfil não pode alterar esta conta.', 'forbidden', 403);
		}
		if (id === actor.id && (patch.active === false || (patch.role && patch.role !== actor.role))) {
			throw new DomainError('Você não pode desativar ou rebaixar a própria conta.', 'self');
		}
		if (
			target.role === 'owner' &&
			(patch.active === false || (patch.role && patch.role !== 'owner'))
		) {
			const [{ n }] = await tx<
				{ n: number }[]
			>`select count(*)::int n from staff_users where role = 'owner' and active`;
			if (n <= 1)
				throw new DomainError('A loja precisa de pelo menos um dono ativo.', 'last_owner');
		}
		await tx`
			update staff_users set
				role = coalesce(${patch.role ?? null}, role),
				active = coalesce(${patch.active ?? null}, active),
				display_name = coalesce(${patch.displayName ?? null}, display_name)
			where id = ${id}`;
		const a: Actor = { type: 'staff', id: actor.id };
		await audit(tx, a, 'staff.updated', 'staff_user', id, patch);
	});
}

export async function createStaffAccount(
	actor: StaffSession,
	input: { email: string; displayName: string; role: StaffRole; password: string }
) {
	if (!canManage(actor, input.role))
		throw new DomainError('Seu perfil não pode criar esta conta.', 'forbidden', 403);
	if (input.password.length < 10)
		throw new DomainError('A senha precisa ter pelo menos 10 caracteres.');
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	const url = config().PUBLIC_SUPABASE_URL;
	if (!key || !url) {
		throw new DomainError(
			'Crie a conta no painel do Supabase e depois atribua o perfil aqui.',
			'no_admin_key',
			501
		);
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
		throw new DomainError(`Não foi possível criar a conta: ${error?.message ?? ''}`);
	await db().begin(async (tx) => {
		await tx`insert into staff_users (id, display_name, role) values (${data.user.id}, ${input.displayName}, ${input.role})`;
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
	if (!canManage(actor, role))
		throw new DomainError('Seu perfil não pode criar esta conta.', 'forbidden', 403);
	await db().begin(async (tx) => {
		const [u] = await tx<
			{ id: string }[]
		>`select id from auth.users where lower(email) = lower(${email})`;
		if (!u)
			throw new DomainError('Nenhum usuário com este e-mail no Supabase Auth.', 'not_found', 404);
		await tx`
			insert into staff_users (id, display_name, role) values (${u.id}, ${displayName}, ${role})
			on conflict (id) do update set role = excluded.role, display_name = excluded.display_name, active = true`;
		await audit(tx, { type: 'staff', id: actor.id }, 'staff.linked', 'staff_user', u.id, {
			email,
			role
		});
	});
}
