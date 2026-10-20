// Editorial pages. Directus stores them as a constrained list of text blocks
// (no raw HTML/JS); without a CMS the defaults below are served.
import { z } from 'zod';
import { config } from '../config';

export interface ContentPage {
	slug: string;
	title: string;
	blocks: { type: 'heading' | 'paragraph'; text: string }[];
}

const DEFAULTS: Record<string, ContentPage> = {
	sobre: { slug: 'sobre', title: 'Sobre nós', blocks: [{ type: 'paragraph', text: 'Hambúrgueres artesanais feitos na hora.' }] },
	alergenicos: {
		slug: 'alergenicos',
		title: 'Alergênicos',
		blocks: [{ type: 'paragraph', text: 'Nossos pães contêm glúten e a maioria dos queijos contém lactose. Avise a equipe sobre alergias: marcamos o pedido para a cozinha.' }]
	},
	privacidade: {
		slug: 'privacidade',
		title: 'Política de privacidade',
		blocks: [
			{ type: 'paragraph', text: 'Coletamos nome, telefone e endereço apenas para preparar, entregar e dar suporte ao seu pedido (LGPD, art. 7º, V).' },
			{ type: 'paragraph', text: 'Promoções só são enviadas com seu consentimento, que pode ser retirado a qualquer momento. Pagamentos com cartão são processados pelo provedor de pagamento; não armazenamos dados de cartão.' },
			{ type: 'paragraph', text: 'Para acessar, corrigir ou excluir seus dados, fale com a loja.' }
		]
	},
	entrega: {
		slug: 'entrega',
		title: 'Entrega, cancelamento e reembolso',
		blocks: [{ type: 'paragraph', text: 'A taxa de entrega depende do endereço e aparece antes de você confirmar o pedido. Se a loja cancelar um pedido pago, o valor é estornado pelo mesmo meio de pagamento.' }]
	}
};

const pageSchema = z.object({
	slug: z.string(),
	title: z.string(),
	blocks: z.array(z.object({ type: z.enum(['heading', 'paragraph']), text: z.string() })).nullable()
});

export async function getPage(slug: string): Promise<ContentPage | null> {
	const { DIRECTUS_URL, DIRECTUS_TOKEN } = config();
	if (DIRECTUS_URL && /^[a-z0-9-]+$/.test(slug)) {
		try {
			const url = new URL(`/items/pages?filter[slug][_eq]=${slug}&filter[status][_eq]=published&limit=1`, DIRECTUS_URL);
			const res = await fetch(url, {
				headers: DIRECTUS_TOKEN ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` } : {},
				signal: AbortSignal.timeout(4000)
			});
			if (res.ok) {
				const [row] = z.array(pageSchema).parse(((await res.json()) as { data: unknown }).data);
				if (row) return { slug: row.slug, title: row.title, blocks: row.blocks ?? [] };
			}
		} catch (err) {
			console.error(JSON.stringify({ msg: 'page fetch failed', slug, err: String(err) }));
		}
	}
	return DEFAULTS[slug] ?? null;
}
