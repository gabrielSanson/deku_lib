import { error } from '@sveltejs/kit';
import { getPage } from '#lib/server/catalog/pages.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const page = await getPage(params.slug);
	if (!page) error(404, 'Página não encontrada.');
	return { page };
};
