import { attempt, formString } from '#lib/server/actions.ts';
import { FRONT_OF_HOUSE, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { getCatalog } from '#lib/server/catalog/service.ts';
import { config } from '#lib/server/config.ts';
import { db } from '#lib/server/db.ts';
import { setSoldOut } from '#lib/server/settings/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, FRONT_OF_HOUSE);
	const catalog = await getCatalog();
	const overrides = await db()<{ sku: string; reason: string | null; updated_at: Date }[]>`
		select sku, reason, updated_at from product_availability_overrides where sold_out and channel = 'all'`;
	return { catalog, overrides, cmsUrl: config().DIRECTUS_URL ?? null };
};

export const actions: Actions = {
	toggle: async (event) => {
		const staff = requireStaff(event, FRONT_OF_HOUSE);
		const d = await event.request.formData();
		return attempt(async () => {
			await setSoldOut(formString(d, 'sku'), formString(d, 'soldOut') === '1', staffActor(staff), formString(d, 'reason') || undefined);
			return { ok: true };
		});
	}
};
