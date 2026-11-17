// Minha conta → Segurança: two-step sign-in with an authenticator app (S5.9, Supabase Auth TOTP).
import { attempt, failText, formString } from '#lib/server/actions.ts';
import { adminMfaRequired, setAdminMfaRequired } from '#lib/server/auth/mfa.ts';
import { can, requirePermission } from '#lib/server/auth/permissions.ts';
import { requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { mfaApplies } from '#lib/domain/mfa.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const staff = requireStaff(event);
	const supabase = event.locals.supabase;
	const factors = supabase ? ((await supabase.auth.mfa.listFactors()).data?.totp ?? []) : [];
	return {
		factors: factors.map((f) => ({
			id: f.id,
			name: f.friendly_name ?? null,
			createdAt: f.created_at
		})),
		available: Boolean(supabase) && !event.locals.platformView,
		applies: mfaApplies(staff.permissions),
		required: await adminMfaRequired(),
		canRequire: can(staff, 'staff.manage')
	};
};

export const actions: Actions = {
	enrol: async (event) => {
		requireStaff(event);
		const supabase = event.locals.supabase;
		if (!supabase) return failText(400, 'err.mfa.unavailable');
		// Leftover factors from an abandoned set-up would block a new one.
		const listed = await supabase.auth.mfa.listFactors();
		for (const f of listed.data?.all ?? []) {
			if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
		}
		const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
		if (error || !data) return failText(400, 'err.mfa.unavailable');
		return { enrolling: { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret } };
	},
	confirm: async (event) => {
		requireStaff(event);
		const supabase = event.locals.supabase;
		const d = await event.request.formData();
		const factorId = formString(d, 'factorId');
		const code = formString(d, 'code').replace(/\s/g, '');
		if (!supabase) return failText(400, 'err.mfa.unavailable');
		const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
		if (error)
			return failText(400, 'err.mfa.code', {
				data: {
					enrolling: { factorId, qr: formString(d, 'qr'), secret: formString(d, 'secret') }
				}
			});
		return { confirmed: true };
	},
	remove: async (event) => {
		requireStaff(event);
		const supabase = event.locals.supabase;
		if (!supabase) return failText(400, 'err.mfa.unavailable');
		const factorId = formString(await event.request.formData(), 'factorId');
		// Supabase only removes a verified factor from a session that already passed the second step.
		const { error } = await supabase.auth.mfa.unenroll({ factorId });
		if (error) return failText(400, 'err.mfa.removeNeedsCode');
		return { removed: true };
	},
	require: async (event) => {
		const staff = requirePermission(event, 'staff.manage');
		const on = formString(await event.request.formData(), 'on') === '1';
		return attempt(async () => {
			await setAdminMfaRequired(on, staffActor(staff));
			return { requireSaved: true };
		});
	}
};
