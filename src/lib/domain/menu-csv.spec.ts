import { describe, expect, it } from 'vitest';
import { MENU_CSV_TEMPLATE, parseCsv, parseMenuCsv } from './menu-csv';

describe('parseCsv', () => {
	it('reads quoted fields with delimiters, quotes and line breaks', () => {
		expect(parseCsv('a;"b;c";"say ""hi"""\r\n1;"two\nlines";3', ';')).toEqual([
			['a', 'b;c', 'say "hi"'],
			['1', 'two\nlines', '3']
		]);
	});
});

describe('parseMenuCsv', () => {
	it('turns the template into categories, products and extras', () => {
		const r = parseMenuCsv(MENU_CSV_TEMPLATE);
		expect(r.fileProblem).toBeNull();
		expect(r.rows.every((row) => row.problems.length === 0)).toBe(true);
		const c = r.catalog!;
		expect(c.categories.map((x) => x.name)).toEqual(['Lanches', 'Bebidas']);
		const x = c.products[0];
		expect(x).toMatchObject({
			sku: 'X-SALADA',
			slug: 'x-salada',
			priceCents: 2590,
			categoryId: 'lanches'
		});
		expect(x.description).toBe('Pão, hambúrguer, queijo, alface e tomate');
		expect(x.modifierGroups[0].options.map((o) => [o.name, o.priceCents])).toEqual([
			['Bacon', 400],
			['Queijo extra', 300]
		]);
		expect(c.products[1].modifierGroups).toEqual([]);
	});

	it('reads comma-separated files with headers in any case or accent', () => {
		const r = parseMenuCsv('Categoria,Nome,Descrição,Preço\nPizzas,Margherita,,"49,90"\n');
		expect(r.catalog?.products[0]).toMatchObject({ name: 'Margherita', priceCents: 4990 });
	});

	it('reports each bad row with its line number and imports nothing', () => {
		const r = parseMenuCsv(
			'categoria;nome;preco;adicionais\n;Sem categoria;10\nDoces;;5\nDoces;Bolo;abc\nDoces;Bolo;7\nDoces;Torta;8;Calda +x\n'
		);
		expect(r.catalog).toBeNull();
		expect(r.rows.map((x) => [x.line, x.problems])).toEqual([
			[2, ['noCategory']],
			[3, ['noName']],
			[4, ['badPrice']],
			[5, ['duplicate']],
			[6, ['badExtra']]
		]);
	});

	it('refuses files without the needed columns or rows', () => {
		expect(parseMenuCsv('produto;valor\nA;1').fileProblem).toBe('columns');
		expect(parseMenuCsv('categoria;nome;preco\n').fileProblem).toBe('empty');
	});

	it('keeps codes unique when two products share a name in different categories', () => {
		const r = parseMenuCsv('categoria;nome;preco\nLanches;Combo;20\nBebidas;Combo;5\n');
		expect(r.catalog?.products.map((p) => [p.sku, p.slug])).toEqual([
			['COMBO', 'combo'],
			['COMBO-2', 'combo-2']
		]);
	});
});
