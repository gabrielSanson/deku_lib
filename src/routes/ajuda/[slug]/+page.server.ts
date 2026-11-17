import { error } from '@sveltejs/kit';
import { helpArticle } from '#lib/platform/help/index.ts';
import { supportWhatsapp, whatsappLink } from '#lib/server/platform/support.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const article = helpArticle(params.slug);
	if (!article) error(404, 'Artigo não encontrado.');
	const phone = await supportWhatsapp();
	return { article, support: phone ? whatsappLink(phone) : null };
};
