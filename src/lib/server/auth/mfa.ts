// Two-step sign-in (S5.9). Factors live in Supabase Auth; whether someone has one is read from the
// auth schema through the platform connection (the session cookie's user copy is not signed).
import { audit, type Actor } from '../audit';
import { db, platformDb, type Db } from '../db';

export async function hasVerifiedFactor(userId: string): Promise<boolean> {
	const [r] = await platformDb()<{ ok: boolean }[]>`
		select exists (select 1 from auth.mfa_factors where user_id = ${userId}
			and status::text = 'verified') as ok`;
	return Boolean(r?.ok);
}

export async function adminMfaRequired(sql: Db = db()): Promise<boolean> {
	const [r] = await sql<{ on: boolean }[]>`
		select require_admin_mfa as on from store_runtime_settings where shop_id = current_shop_id()`;
	return Boolean(r?.on);
}

export async function setAdminMfaRequired(on: boolean, actor: Actor) {
	await db().begin(async (tx) => {
		await tx`update store_runtime_settings set require_admin_mfa = ${on}
			where shop_id = current_shop_id()`;
		await audit(tx, actor, 'security.admin_mfa', 'store_runtime_settings', '1', { on });
	});
}
