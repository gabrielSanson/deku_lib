import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { catalog } = await parent();
	const product = catalog.products.find((p) => p.slug === params.slug);
	if (!product) error(404, 'Produto não encontrado.');
	return { product };
};
