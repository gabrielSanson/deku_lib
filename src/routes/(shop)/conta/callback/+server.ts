// Google sends the customer back here with a one-time code; exchange it for a session.
import { redirect } from '@sveltejs/kit';
import { safeAccountNext } from '#lib/domain/account.ts';
import { ensureCustomer } from '#lib/server/auth/customer.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const next = safeAccountNext(url.searchParams.get('next'));
	const code = url.searchParams.get('code');
	if (!locals.supabase || !code) redirect(303, '/conta/entrar');
	const { data, error } = await locals.supabase.auth.exchangeCodeForSession(code);
	if (error || !data.user) redirect(303, '/conta/entrar');
	await ensureCustomer(data.user);
	redirect(303, next);
};
