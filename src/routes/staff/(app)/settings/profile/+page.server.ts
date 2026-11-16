// The shop's details (name, phone, address), editable after the setup wizard.
import { attempt, formString } from '#lib/server/actions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { getStoreProfile, saveStoreInfo } from '#lib/server/settings/profile.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'settings.edit');
	return {
		profile: await getStoreProfile(undefined, { fresh: true })
	};
};

export const actions: Actions = {
	store: async (event) => {
		const staff = requirePermission(event, 'settings.edit');
		const d = await event.request.formData();
		return attempt(async () => {
			await saveStoreInfo(
				{
					displayName: formString(d, 'displayName'),
					phone: formString(d, 'phone'),
					addressLine: formString(d, 'addressLine'),
					city: formString(d, 'city')
				},
				staffActor(staff)
			);
			return { ok: 'store' as const };
		});
	}
};
