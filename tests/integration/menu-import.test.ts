// S1.6: loading a menu from the owner's spreadsheet.
import { afterAll, describe, expect, it } from 'vitest';
import { MENU_CSV_TEMPLATE } from '#lib/domain/menu-csv.ts';
import { getCatalog } from '#lib/server/catalog/service.ts';
import { importMenuCsv } from '#lib/server/catalog/csv-import.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';

const actor = { type: 'system' as const, id: null };

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

describe('menu import from a spreadsheet', () => {
	it('adds categories, products and extras, and a second import updates them', async () => {
		expect(await importMenuCsv(MENU_CSV_TEMPLATE, actor)).toEqual({ products: 2, categories: 2 });
		let catalog = await getCatalog();
		const x = catalog.products.find((p) => p.sku === 'X-SALADA');
		expect(x?.priceCents).toBe(2590);
		expect(x?.modifierGroups[0]?.options.map((o) => o.priceCents)).toEqual([400, 300]);

		await importMenuCsv(MENU_CSV_TEMPLATE.replace('25,90', '27,00'), actor);
		catalog = await getCatalog();
		expect(catalog.products.filter((p) => p.sku === 'X-SALADA')).toHaveLength(1);
		expect(catalog.products.find((p) => p.sku === 'X-SALADA')?.priceCents).toBe(2700);
	});

	it('imports nothing when a row is wrong', async () => {
		const before = await db()`select count(*)::int as n from menu_products`;
		await expect(
			importMenuCsv('categoria;nome;preco\nDoces;Bolo;abc\nDoces;Torta;8\n', actor)
		).rejects.toThrow();
		const after = await db()`select count(*)::int as n from menu_products`;
		expect(after[0].n).toBe(before[0].n);
	});
});
