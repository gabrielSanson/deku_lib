import { fail, redirect } from '@sveltejs/kit';
import { formString } from '#lib/server/actions.ts';
import { isBadCredentials, landingFor } from '#lib/server/auth/login.ts';
import { loadStaff } from '#lib/server/auth/staff.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.staff) redirect(303, landingFor(locals.staff.role));
	return { configured: locals.supabase !== null };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const email = formString(data, 'email');
		const password = formString(data, 'password');
		if (!locals.supabase)
			return fail(503, { email, error: 'Login indisponível: Supabase não configurado.' });
		if (!email || !password) return fail(400, { email, error: 'Informe e-mail e senha.' });
		const { data: auth, error } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});
		if (error) {
			if (isBadCredentials(error))
				return fail(400, { email, error: 'E-mail ou senha incorretos.' });
			console.error(
				JSON.stringify({ msg: 'staff login failed', status: error.status, err: String(error) })
			);
			return fail(503, { email, error: 'Login indisponível, tente novamente.' });
		}
		const staff = await loadStaff(auth.user.id, auth.user.email ?? null);
		if (!staff) {
			await locals.supabase.auth.signOut();
			return fail(403, { email, error: 'Esta conta não tem acesso à área da equipe.' });
		}
		redirect(303, landingFor(staff.role));
	}
};
