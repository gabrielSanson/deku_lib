import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { blocksToText, listPages, savePage } from '#lib/server/catalog/pages.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const pages = await listPages();
	return {
		pages: pages.map((p) => ({
			slug: p.slug,
			title: p.title,
			text: blocksToText(p.blocks),
			published: p.published
		}))
	};
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		return attempt(async () => {
			await savePage(
				{
					slug: formString(d, 'slug'),
					title: formString(d, 'title'),
					text: String(d.get('text') ?? ''),
					published: d.get('published') === 'on'
				},
				staffActor(staff)
			);
			return { ok: formString(d, 'slug') };
		});
	}
};
