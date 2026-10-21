import { fail, redirect } from '@sveltejs/kit';
import { loginInput, safeAccountNext, signupInput, phoneFromInput } from '#lib/domain/account.ts';
import { formString } from '#lib/server/actions.ts';
import { ensureCustomer } from '#lib/server/auth/customer.ts';
import { config } from '#lib/server/config.ts';
import { getTexts } from '#lib/server/settings/texts.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const next = safeAccountNext(url.searchParams.get('next'));
	if (locals.customer) redirect(303, next);
	return {
		mode: url.searchParams.get('modo') === 'criar' ? ('criar' as const) : ('entrar' as const),
		next,
		google: config().GOOGLE_LOGIN_ENABLED,
		configured: locals.supabase !== null
	};
};

export const actions: Actions = {
	login: async ({ request, locals }) => {
		const texts = await getTexts();
		const form = await request.formData();
		const email = formString(form, 'email');
		const next = safeAccountNext(formString(form, 'next'));
		if (!locals.supabase)
			return fail(503, { mode: 'entrar', email, error: texts['account.error.unavailable'] });
		const parsed = loginInput.safeParse({ email, password: formString(form, 'password') });
		if (!parsed.success)
			return fail(400, { mode: 'entrar', email, error: texts['account.error.invalid'] });
		const { data, error } = await locals.supabase.auth.signInWithPassword(parsed.data);
		if (error || !data.user)
			return fail(400, { mode: 'entrar', email, error: texts['account.error.login'] });
		await ensureCustomer(data.user);
		redirect(303, next);
	},

	signup: async ({ request, locals }) => {
		const texts = await getTexts();
		const form = await request.formData();
		const name = formString(form, 'name');
		const phoneInput = formString(form, 'phone');
		const email = formString(form, 'email');
		const next = safeAccountNext(formString(form, 'next'));
		if (!locals.supabase)
			return fail(503, {
				mode: 'criar',
				name,
				phone: phoneInput,
				email,
				error: texts['account.error.unavailable']
			});
		const parsed = signupInput.safeParse({
			name,
			phone: phoneInput,
			email,
			password: formString(form, 'password')
		});
		const phone = parsed.success ? phoneFromInput(parsed.data.phone) : { ok: false as const };
		if (!parsed.success || !phone.ok)
			return fail(400, {
				mode: 'criar',
				name,
				phone: phoneInput,
				email,
				error: texts['account.error.invalid']
			});

		const { data, error } = await locals.supabase.auth.signUp({
			email: parsed.data.email,
			password: parsed.data.password,
			options: { data: { name: parsed.data.name, phone: phone.phoneE164 ?? '' } }
		});
		// Supabase answers an address that already has an account with no error and no identities.
		if (error || !data.user || data.user.identities?.length === 0) {
			return fail(400, {
				mode: 'criar',
				name,
				phone: phoneInput,
				email,
				error: error ? texts['account.error.invalid'] : texts['account.error.exists']
			});
		}
		// With e-mail confirmation on, there is no session until the link is opened.
		if (data.session) {
			await ensureCustomer(data.user);
			redirect(303, next);
		}
		return { mode: 'criar' as const, email, confirm: true };
	},

	google: async ({ request, locals, url }) => {
		const texts = await getTexts();
		const form = await request.formData();
		const next = safeAccountNext(formString(form, 'next'));
		if (!locals.supabase || !config().GOOGLE_LOGIN_ENABLED)
			return fail(503, { mode: 'entrar', error: texts['account.error.unavailable'] });
		const callback = `${url.origin}/conta/callback?next=${encodeURIComponent(next)}`;
		const { data, error } = await locals.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: callback }
		});
		if (error || !data.url)
			return fail(502, { mode: 'entrar', error: texts['account.error.unavailable'] });
		redirect(303, data.url);
	}
};
