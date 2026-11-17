// The second step: the code from the authenticator app, before payment, fiscal, team or price screens.
import { redirect } from '@sveltejs/kit';
import { failText, formString } from '#lib/server/actions.ts';
import { requireStaff } from '#lib/server/auth/staff.ts';
import { rateLimit } from '#lib/server/rate-limit.ts';
import { safeNext } from '#lib/domain/mfa.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event);
	return { next: safeNext(event.url.searchParams.get('next')) };
};

export const actions: Actions = {
	default: async (event) => {
		const staff = requireStaff(event);
		const supabase = event.locals.supabase;
		if (!supabase) return failText(400, 'err.mfa.unavailable');
		if (!rateLimit(`mfa:${staff.id}`, 10, 5 * 60_000)) return failText(429, 'err.pin.tooMany');
		const d = await event.request.formData();
		const code = formString(d, 'code').replace(/\s/g, '');
		const factors = (await supabase.auth.mfa.listFactors()).data?.totp ?? [];
		const factor = factors.find((f) => f.status === 'verified');
		if (!factor) return failText(400, 'err.mfa.unavailable');
		const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
		if (error) return failText(400, 'err.mfa.code');
		redirect(303, safeNext(formString(d, 'next')));
	}
};
