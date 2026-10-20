import { fail, redirect } from '@sveltejs/kit';
import { formString } from '#lib/server/actions.ts';
import type { Actions, PageServerLoad } from './$types';

function safeNext(next: string | null) {
	return next && next.startsWith('/') && !next.startsWith('//') ? next : '/staff';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.staff) redirect(303, safeNext(url.searchParams.get('next')));
	return { configured: locals.supabase !== null };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const data = await request.formData();
		const email = formString(data, 'email');
		const password = formString(data, 'password');
		if (!locals.supabase) return fail(503, { email, error: 'Login indisponível: Supabase não configurado.' });
		if (!email || !password) return fail(400, { email, error: 'Informe e-mail e senha.' });
		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
		if (error) return fail(400, { email, error: 'E-mail ou senha incorretos.' });
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
