import { attempt, formString } from '#lib/server/actions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import {
	blocksToText,
	createPage,
	deletePage,
	listPages,
	savePage
} from '#lib/server/catalog/pages.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'settings.edit');
	const pages = await listPages();
	return {
		pages: pages.map((p) => ({
			slug: p.slug,
			title: p.title,
			text: blocksToText(p.blocks),
			published: p.published,
			builtIn: p.builtIn
		}))
	};
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requirePermission(event, 'settings.edit');
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
	},
	create: async (event) => {
		const staff = requirePermission(event, 'settings.edit');
		const d = await event.request.formData();
		return attempt(async () => ({
			created: await createPage(formString(d, 'title'), staffActor(staff))
		}));
	},
	delete: async (event) => {
		const staff = requirePermission(event, 'settings.edit');
		const d = await event.request.formData();
		return attempt(async () => {
			await deletePage(formString(d, 'slug'), staffActor(staff));
			return { deleted: true };
		});
	}
};
