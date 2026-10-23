// Customer-facing pages, stored as a constrained list of text blocks (no raw
// HTML or scripts) and edited in the staff area. Until a page is edited, the
// default below is served; once saved, the saved row decides, so an unpublished
// page is a 404 rather than the default. The owner can add more pages; only
// those can be deleted, the four built-in ones can be hidden instead.
import { z } from 'zod';
import { slugify } from '#lib/domain/slug.ts';
import { audit, type Actor } from '../audit';
import { db, type Db } from '../db';
import { DomainError } from '../errors';

export interface ContentPage {
	slug: string;
	title: string;
	blocks: { type: 'heading' | 'paragraph'; text: string }[];
}

const DEFAULTS: Record<string, ContentPage> = {
	sobre: {
		slug: 'sobre',
		title: 'Sobre nós',
		blocks: [{ type: 'paragraph', text: 'Hambúrgueres artesanais feitos na hora.' }]
	},
	alergenicos: {
		slug: 'alergenicos',
		title: 'Alergênicos',
		blocks: [
			{
				type: 'paragraph',
				text: 'Nossos pães contêm glúten e a maioria dos queijos contém lactose. Avise a equipe sobre alergias: marcamos o pedido para a cozinha.'
			}
		]
	},
	privacidade: {
		slug: 'privacidade',
		title: 'Política de privacidade',
		blocks: [
			{
				type: 'paragraph',
				text: 'Coletamos nome, telefone e endereço apenas para preparar, entregar e dar suporte ao seu pedido (LGPD, art. 7º, V).'
			},
			{
				type: 'paragraph',
				text: 'Promoções só são enviadas com seu consentimento, que pode ser retirado a qualquer momento. Pagamentos com cartão são processados pelo provedor de pagamento; não armazenamos dados de cartão.'
			},
			{ type: 'paragraph', text: 'Para acessar, corrigir ou excluir seus dados, fale com a loja.' }
		]
	},
	entrega: {
		slug: 'entrega',
		title: 'Entrega, cancelamento e reembolso',
		blocks: [
			{
				type: 'paragraph',
				text: 'A taxa de entrega depende do endereço e aparece antes de você confirmar o pedido. Se a loja cancelar um pedido pago, o valor é estornado pelo mesmo meio de pagamento.'
			}
		]
	}
};

export const PAGE_SLUGS = Object.keys(DEFAULTS);

export const pageBlocks = z
	.array(
		z.object({ type: z.enum(['heading', 'paragraph']), text: z.string().trim().min(1).max(2000) })
	)
	.max(50);

export async function getPage(slug: string, sql: Db = db()): Promise<ContentPage | null> {
	if (!/^[a-z0-9-]+$/.test(slug)) return null;
	// A failed query is an error, not a reason to show the default: the saved page
	// may be unpublished on purpose.
	const [row] = await sql<
		{ slug: string; title: string; blocks: unknown; published: boolean }[]
	>`select slug, title, blocks, published from content_pages where slug = ${slug}`;
	if (row) {
		if (!row.published) return null;
		return { slug: row.slug, title: row.title, blocks: pageBlocks.parse(row.blocks) };
	}
	return DEFAULTS[slug] ?? null;
}

/** The pages staff can edit: saved ones plus the defaults not yet changed. */
export async function listPages(
	sql: Db = db()
): Promise<(ContentPage & { published: boolean; builtIn: boolean })[]> {
	const rows = await sql<{ slug: string; title: string; blocks: unknown; published: boolean }[]>`
		select slug, title, blocks, published from content_pages order by slug`;
	const saved = new Map(
		rows.map((r) => [
			r.slug,
			{ slug: r.slug, title: r.title, blocks: pageBlocks.parse(r.blocks), published: r.published }
		])
	);
	return [
		...PAGE_SLUGS.map((s) => ({
			...(saved.get(s) ?? { ...DEFAULTS[s], published: true }),
			builtIn: true
		})),
		...[...saved.values()].filter((p) => !DEFAULTS[p.slug]).map((p) => ({ ...p, builtIn: false }))
	];
}

export async function savePage(
	input: { slug: string; title: string; text: string; published: boolean },
	actor: Actor
) {
	if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(input.slug)) throw new DomainError('err.menu.pageSlug');
	const title = input.title.trim();
	if (!title) throw new DomainError('err.menu.pageTitle');
	const blocks = pageBlocks.parse(textToBlocks(input.text));
	await db().begin(async (tx) => {
		await tx`
			insert into content_pages (slug, title, blocks, published)
			values (${input.slug}, ${title}, ${tx.json(blocks)}, ${input.published})
			on conflict (slug) do update set title = excluded.title, blocks = excluded.blocks,
				published = excluded.published, updated_at = now()`;
		await audit(tx, actor, 'page.saved', 'content_page', input.slug, { title });
	});
}

/**
 * Adds a page named by the owner, unpublished and empty, at /p/<slug from the title>.
 * Returns the slug. A taken slug gets a number ("cardapio-2").
 */
export async function createPage(title: string, actor: Actor): Promise<string> {
	const name = title.trim();
	if (!name) throw new DomainError('err.menu.pageTitle');
	if (name.length > 120) throw new DomainError('err.menu.pageTitle');
	const base = slugify(name, 50) || 'pagina';
	return db().begin(async (tx) => {
		const taken = new Set(
			(
				await tx<{ slug: string }[]>`
					select slug from content_pages where slug = ${base} or slug like ${base + '-%'}`
			).map((r) => r.slug)
		);
		let slug = base;
		for (let n = 2; taken.has(slug) || DEFAULTS[slug]; n++) slug = `${base}-${n}`;
		await tx`insert into content_pages (slug, title, blocks, published)
			values (${slug}, ${name}, ${tx.json([])}, false)`;
		await audit(tx, actor, 'page.created', 'content_page', slug, { title: name });
		return slug;
	});
}

/** Deletes a page the owner added. The built-in pages can only be unpublished. */
export async function deletePage(slug: string, actor: Actor) {
	if (DEFAULTS[slug]) throw new DomainError('err.menu.pageBuiltIn');
	await db().begin(async (tx) => {
		const r = await tx`delete from content_pages where slug = ${slug}`;
		if (!r.count)
			throw new DomainError('err.menu.pageNotFound', { code: 'not_found', status: 404 });
		await audit(tx, actor, 'page.deleted', 'content_page', slug);
	});
}

/** Plain text editing: blank lines separate paragraphs, a line starting with "## " is a heading. */
export function textToBlocks(text: string): ContentPage['blocks'] {
	return text
		.replace(/\r\n/g, '\n')
		.split(/\n\s*\n/)
		.map((b) => b.trim())
		.filter(Boolean)
		.map((b) =>
			b.startsWith('## ')
				? { type: 'heading' as const, text: b.slice(3).trim() }
				: { type: 'paragraph' as const, text: b }
		);
}

export function blocksToText(blocks: ContentPage['blocks']): string {
	return blocks.map((b) => (b.type === 'heading' ? `## ${b.text}` : b.text)).join('\n\n');
}
