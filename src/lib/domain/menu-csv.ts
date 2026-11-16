// The menu spreadsheet an owner fills in to load a whole menu at once (Cardápio → Importar).
// Columns: categoria, nome, descricao, preco, adicionais. "adicionais" lists extras as
// "Bacon +4,00 | Queijo extra +3,50 | Sem molho"; an extra without a price is free.
// Excel in Brazil saves CSV with ";", others use ","; both are read.
import type { Catalog, Category, ModifierGroup, Product } from './catalog';
import { parseBRL } from './money';
import { skuFrom, slugify } from './slug';

export const MENU_CSV_COLUMNS = ['categoria', 'nome', 'descricao', 'preco', 'adicionais'] as const;
export const MENU_CSV_MAX_ROWS = 1000;

export const MENU_CSV_TEMPLATE =
	'﻿categoria;nome;descricao;preco;adicionais\r\n' +
	'Lanches;X-Salada;Pão, hambúrguer, queijo, alface e tomate;25,90;Bacon +4,00 | Queijo extra +3,00\r\n' +
	'Bebidas;Suco de laranja;300 ml;9,00;\r\n';

export type MenuCsvProblem =
	'columns' | 'empty' | 'tooMany' | 'noCategory' | 'noName' | 'badPrice' | 'badExtra' | 'duplicate';

export interface MenuCsvRow {
	line: number;
	category: string;
	name: string;
	description: string;
	priceCents: number | null;
	extras: { name: string; priceCents: number }[];
	problems: MenuCsvProblem[];
}

export interface MenuCsvResult {
	/** Problems with the file as a whole (wrong columns, no rows, too many rows). */
	fileProblem: MenuCsvProblem | null;
	rows: MenuCsvRow[];
	/** Only when every row is fine. */
	catalog: Catalog | null;
}

/** Splits CSV text into records, honouring quotes ("a;b" and "" for a quote). */
export function parseCsv(text: string, delimiter: string): string[][] {
	const records: string[][] = [];
	let field = '';
	let record: string[] = [];
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (quoted) {
			if (ch === '"' && text[i + 1] === '"') {
				field += '"';
				i++;
			} else if (ch === '"') quoted = false;
			else field += ch;
		} else if (ch === '"' && field === '') quoted = true;
		else if (ch === delimiter) {
			record.push(field);
			field = '';
		} else if (ch === '\n' || ch === '\r') {
			if (ch === '\r' && text[i + 1] === '\n') i++;
			record.push(field);
			records.push(record);
			record = [];
			field = '';
		} else field += ch;
	}
	if (field !== '' || record.length) {
		record.push(field);
		records.push(record);
	}
	return records;
}

function header(cell: string) {
	return slugify(cell.trim(), 20);
}

function parseExtras(cell: string): { name: string; priceCents: number }[] | null {
	const out: { name: string; priceCents: number }[] = [];
	for (const part of cell.split('|')) {
		const p = part.trim();
		if (!p) continue;
		const plus = p.lastIndexOf('+');
		if (plus < 0) {
			out.push({ name: p, priceCents: 0 });
			continue;
		}
		const name = p.slice(0, plus).trim();
		const price = parseBRL(p.slice(plus + 1));
		if (!name || price === null) return null;
		out.push({ name, priceCents: price });
	}
	return out;
}

function unique(base: string, used: Set<string>, max: number) {
	for (let i = 1; ; i++) {
		const candidate = i === 1 ? base : `${base.slice(0, max - String(i).length - 1)}-${i}`;
		if (!used.has(candidate)) {
			used.add(candidate);
			return candidate;
		}
	}
}

export function parseMenuCsv(input: string): MenuCsvResult {
	const text = input.startsWith('\ufeff') ? input.slice(1) : input;
	const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
	const delimiter =
		(firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
	const records = parseCsv(text, delimiter).filter((r) => r.some((c) => c.trim()));
	const cols = (records[0] ?? []).map(header);
	const at = Object.fromEntries(MENU_CSV_COLUMNS.map((c) => [c, cols.indexOf(c)]));
	if (at.categoria < 0 || at.nome < 0 || at.preco < 0) {
		return { fileProblem: 'columns', rows: [], catalog: null };
	}
	const body = records.slice(1);
	if (!body.length) return { fileProblem: 'empty', rows: [], catalog: null };
	if (body.length > MENU_CSV_MAX_ROWS) return { fileProblem: 'tooMany', rows: [], catalog: null };

	const cell = (r: string[], c: (typeof MENU_CSV_COLUMNS)[number]) =>
		at[c] >= 0 ? (r[at[c]] ?? '').trim() : '';
	const seen = new Set<string>();
	const rows: MenuCsvRow[] = body.map((r, i) => {
		const problems: MenuCsvProblem[] = [];
		const category = cell(r, 'categoria');
		const name = cell(r, 'nome');
		const priceCents = parseBRL(cell(r, 'preco'));
		const extras = parseExtras(cell(r, 'adicionais'));
		if (!category || !slugify(category)) problems.push('noCategory');
		if (!name || !skuFrom(name)) problems.push('noName');
		if (priceCents === null) problems.push('badPrice');
		if (extras === null) problems.push('badExtra');
		const key = `${slugify(category)}/${slugify(name)}`;
		if (name && seen.has(key)) problems.push('duplicate');
		seen.add(key);
		return {
			line: i + 2,
			category: category.slice(0, 80),
			name: name.slice(0, 120),
			description: cell(r, 'descricao').slice(0, 500),
			priceCents,
			extras: extras ?? [],
			problems
		};
	});
	if (rows.some((r) => r.problems.length)) return { fileProblem: null, rows, catalog: null };
	return { fileProblem: null, rows, catalog: toCatalog(rows) };
}

function toCatalog(rows: MenuCsvRow[]): Catalog {
	const categories = new Map<string, Category>();
	const skus = new Set<string>();
	const slugs = new Set<string>();
	const products: Product[] = [];
	for (const r of rows) {
		const catId = slugify(r.category);
		if (!categories.has(catId)) {
			categories.set(catId, {
				id: catId,
				slug: catId,
				name: r.category,
				position: categories.size,
				imageUrl: null
			});
		}
		const sku = unique(skuFrom(r.name), skus, 40);
		const slug = unique(slugify(r.name, 80), slugs, 80);
		const groups: ModifierGroup[] = r.extras.length
			? [
					{
						id: `adicionais-${slug}`.slice(0, 60).replace(/-+$/, ''),
						name: 'Adicionais',
						minSelections: 0,
						maxSelections: r.extras.length,
						options: r.extras.map((e) => ({
							sku: unique(skuFrom(e.name, `${sku.slice(0, 20)}-A`), skus, 40),
							name: e.name.slice(0, 80),
							priceCents: e.priceCents,
							maxQuantity: 1
						}))
					}
				]
			: [];
		products.push({
			sku,
			slug,
			name: r.name,
			description: r.description,
			imageUrl: null,
			categoryId: catId,
			priceCents: r.priceCents ?? 0,
			prepStation: 'counter',
			channels: ['counter', 'web'],
			allergens: [],
			ingredients: [],
			modifierGroups: groups
		});
	}
	return { version: `csv-${rows.length}`, categories: [...categories.values()], products };
}
