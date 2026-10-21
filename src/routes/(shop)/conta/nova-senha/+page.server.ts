// Reached from the e-mail link: the callback has signed the customer in, so only
// a signed-in customer can change the password.
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { PASSWORD_MAX, PASSWORD_MIN } from '#lib/domain/account.ts';
import { formString } from '#lib/server/actions.ts';
import type { Actions, PageServerLoad } from './$types';

const password = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX);

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.customer) redirect(303, '/conta/recuperar');
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.customer || !locals.supabase) redirect(303, '/conta/recuperar');
		const form = await request.formData();
		const parsed = password.safeParse(formString(form, 'password'));
		if (!parsed.success) return fail(400, { error: 'invalid' });
		if (formString(form, 'confirm') !== parsed.data) return fail(400, { error: 'mismatch' });
		const { error } = await locals.supabase.auth.updateUser({ password: parsed.data });
		if (error) return fail(400, { error: 'failed' });
		redirect(303, '/conta');
	}
};
