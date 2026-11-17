// Ajuda (S5.13): the help articles and the support WhatsApp.
import { HELP_ARTICLES } from '#lib/platform/help/index.ts';
import { supportWhatsapp, whatsappLink } from '#lib/server/platform/support.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const phone = await supportWhatsapp();
	return {
		articles: HELP_ARTICLES.map(({ slug, title, summary }) => ({ slug, title, summary })),
		support: phone ? whatsappLink(phone) : null
	};
};
