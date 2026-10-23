import { redirect } from '@sveltejs/kit';
import { failText, formString } from '#lib/server/actions.ts';
import { shopName } from '#lib/server/settings/profile.ts';
import type { Actions, PageServerLoad } from './$types';

function safeNext(next: string | null) {
	return next && next.startsWith('/') && !next.startsWith('//') ? next : '/staff';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.staff) redirect(303, safeNext(url.searchParams.get('next')));
	return { configured: locals.supabase !== null, shopName: await shopName() };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const data = await request.formData();
		const email = formString(data, 'email');
		const password = formString(data, 'password');
		if (!locals.supabase) return failText(503, 'err.login.unavailable', { data: { email } });
		if (!email || !password) return failText(400, 'err.login.missing', { data: { email } });
		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
		if (error) return failText(400, 'err.login.wrong', { data: { email } });
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
