import { fail, redirect } from '@sveltejs/kit';
import { formString } from '#lib/server/actions.ts';
import { clientKey, rateLimit } from '#lib/server/rate-limit.ts';
import type { Actions, PageServerLoad } from './$types';

function safeNext(next: string | null) {
	return next && next.startsWith('/plataforma') && !next.startsWith('//') ? next : '/plataforma';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.platformAdmin) redirect(303, safeNext(url.searchParams.get('next')));
	return { signedInElsewhere: Boolean(locals.authUserId) };
};

export const actions: Actions = {
	default: async (event) => {
		const { request, locals, url } = event;
		const data = await request.formData();
		const email = formString(data, 'email');
		const password = formString(data, 'password');
		if (!locals.supabase) return fail(503, { email, error: 'Login indisponível.' });
		if (!email || !password) return fail(400, { email, error: 'Informe e-mail e senha.' });
		if (!rateLimit(`platform-login:${clientKey(event)}`, 10, 10 * 60_000))
			return fail(429, { email, error: 'Muitas tentativas. Espere alguns minutos.' });
		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
		if (error) return fail(400, { email, error: 'E-mail ou senha incorretos.' });
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
