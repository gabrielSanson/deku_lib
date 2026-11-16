// Platform admins run the hosted service (the /plataforma console). They are not shop staff.
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { platformDb } from '../db';

export interface PlatformAdmin {
	id: string;
	email: string | null;
}

export async function loadPlatformAdmin(
	userId: string,
	email: string | null
): Promise<PlatformAdmin | null> {
	const [row] = await platformDb()`select user_id from platform_admins where user_id = ${userId}`;
	return row ? { id: userId, email } : null;
}

/** Use in /plataforma loads and actions. */
export function requirePlatformAdmin(event: Pick<RequestEvent, 'locals' | 'url'>): PlatformAdmin {
	const admin = event.locals.platformAdmin;
	if (!admin) {
		redirect(303, `/plataforma/entrar?next=${encodeURIComponent(event.url.pathname)}`);
	}
	return admin;
}

/** Shops a signed-in person works at, with the address of each (the picker at /staff/lojas). */
export async function shopsOfUser(userId: string) {
	return platformDb()<
		{ id: string; name: string; role: string; host: string | null; status: string }[]
	>`
		select s.id, s.name, m.role, s.status,
			(select d.host from shop_domains d where d.shop_id = s.id
				order by (d.kind = 'custom' and d.verified_at is not null) desc, d.host limit 1) as host
		from shop_members m join shops s on s.id = m.shop_id
		where m.user_id = ${userId} and m.active and s.status <> 'closed'
		order by s.name`;
}
