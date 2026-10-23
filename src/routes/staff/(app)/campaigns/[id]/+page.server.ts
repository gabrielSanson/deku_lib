import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { fromShopInput } from '#lib/domain/time.ts';
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { getCampaign, saveCampaign } from '#lib/server/campaigns/service.ts';
import { getCatalog } from '#lib/server/catalog/service.ts';
import { uploadMenuImage } from '#lib/server/catalog/images.ts';
import { isUuid } from '#lib/domain/ids.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const id = event.params.id;
	if (id !== 'new' && !isUuid(id)) error(404, 'Campanha não encontrada');
	const campaign = id === 'new' ? null : await getCampaign(id);
	if (id !== 'new' && !campaign) error(404, 'Campanha não encontrada');
	const catalog = await getCatalog();
	return {
		campaign,
		products: catalog.products.map((p) => ({ sku: p.sku, name: p.name, categoryId: p.categoryId })),
		categories: catalog.categories.map((c) => ({ id: c.id, name: c.name }))
	};
};

// Dates arrive as datetime-local text in shop time; the service validates the rest.
const dates = z.object({ startsAt: z.string().default(''), endsAt: z.string().default('') });

export const actions: Actions = {
	save: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const form = await event.request.formData();
		let raw: Record<string, unknown>;
		try {
			raw = JSON.parse(formString(form, 'payload'));
		} catch {
			return fail(400, { error: 'Dados inválidos.' });
		}
		const d = dates.parse(raw);
		const startsAt = d.startsAt ? fromShopInput(d.startsAt) : null;
		const endsAt = d.endsAt ? fromShopInput(d.endsAt) : null;
		if ((d.startsAt && !startsAt) || (d.endsAt && !endsAt))
			return fail(400, { error: 'Data inválida.' });
		const photo = form.get('photo');
		const result = await attempt(async () => {
			const imagePath =
				photo instanceof File && photo.size > 0
					? await uploadMenuImage(photo)
					: formString(form, 'removePhoto') === '1'
						? null
						: undefined;
			return saveCampaign(
				{ ...raw, startsAt, endsAt, imagePath } as Parameters<typeof saveCampaign>[0],
				staffActor(staff),
				event.params.id === 'new' ? null : event.params.id
			);
		});
		if (typeof result !== 'string') return result;
		redirect(303, '/staff/campaigns');
	}
};
