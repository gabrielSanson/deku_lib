// Help centre (S5.13): short Portuguese articles shown at /ajuda and linked from the settings
// pages ("Como fazer isso?").
import backups from './backups.md?raw';
import cardapio from './cardapio.md?raw';
import ifood from './ifood.md?raw';
import impressora from './impressora.md?raw';
import notaFiscal from './nota-fiscal.md?raw';
import pix from './pix.md?raw';
import primeirosPassos from './primeiros-passos.md?raw';
import whatsapp from './whatsapp.md?raw';

export interface HelpArticle {
	slug: string;
	title: string;
	summary: string;
	source: string;
}

export const HELP_ARTICLES: HelpArticle[] = [
	{
		slug: 'primeiros-passos',
		title: 'Primeiros passos',
		summary: 'O que configurar antes de abrir.',
		source: primeirosPassos
	},
	{
		slug: 'cardapio',
		title: 'Cardápio',
		summary: 'Produtos, adicionais e itens esgotados.',
		source: cardapio
	},
	{ slug: 'pix', title: 'Pix', summary: 'Chave da loja ou provedor, e estornos.', source: pix },
	{
		slug: 'nota-fiscal',
		title: 'Nota fiscal',
		summary: 'NFC-e, contingência e envio ao contador.',
		source: notaFiscal
	},
	{ slug: 'ifood', title: 'iFood', summary: 'Integração ou lançamento manual.', source: ifood },
	{
		slug: 'impressora',
		title: 'Impressora da cozinha',
		summary: 'Fila de impressão e reimpressão.',
		source: impressora
	},
	{
		slug: 'whatsapp',
		title: 'WhatsApp',
		summary: 'Avisos de pedido e campanhas.',
		source: whatsapp
	},
	{ slug: 'backups', title: 'Backups', summary: 'Cópias diárias e alertas.', source: backups }
];

export const helpArticle = (slug: string) => HELP_ARTICLES.find((a) => a.slug === slug);

/** Settings pages and the article that explains them. */
const CONTEXT: [RegExp, string][] = [
	[/^\/staff\/setup/, 'primeiros-passos'],
	[/^\/staff\/settings\/(profile|hours)/, 'primeiros-passos'],
	[/^\/staff\/settings\/payments/, 'pix'],
	[/^\/staff\/settings\/fiscal/, 'nota-fiscal'],
	[/^\/staff\/settings\/ifood/, 'ifood'],
	[/^\/staff\/settings\/whatsapp/, 'whatsapp'],
	[/^\/staff\/settings\/system/, 'backups'],
	[/^\/staff\/menu/, 'cardapio'],
	[/^\/kitchen/, 'impressora']
];

export function helpFor(path: string): HelpArticle | undefined {
	const hit = CONTEXT.find(([r]) => r.test(path));
	return hit ? helpArticle(hit[1]) : undefined;
}
