// Sends the reset e-mail. Always answers the same way, so the form cannot tell
// which addresses have an account.
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { formString } from '#lib/server/actions.ts';
import type { Actions } from './$types';

const email = z.string().trim().email().max(120);

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const address = formString(await request.formData(), 'email');
		if (!locals.supabase) return fail(503, { email: address, error: 'unavailable' });
		const parsed = email.safeParse(address);
		if (!parsed.success) return fail(400, { email: address, error: 'invalid' });
		const redirectTo = `${url.origin}/conta/callback?next=${encodeURIComponent('/conta/nova-senha')}`;
		await locals.supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo });
		return { sent: true };
	}
};
