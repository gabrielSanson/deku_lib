// Loads a menu from the owner's spreadsheet (Cardápio → Importar) in one transaction.
import { parseMenuCsv } from '#lib/domain/menu-csv.ts';
import type { Actor } from '../audit';
import { db } from '../db';
import { DomainError } from '../errors';
import { importCatalog } from './editor';

export async function importMenuCsv(text: string, actor: Actor) {
	const { catalog } = parseMenuCsv(text);
	if (!catalog) throw new DomainError('err.menu.csvInvalid', { code: 'csv' });
	await db().begin(async (tx) => {
		// A product already on the menu under another code keeps its page address.
		for (const p of catalog.products) {
			for (let i = 1; ; i++) {
				const slug = i === 1 ? p.slug : `${p.slug.slice(0, 74)}-${i}`;
				const [hit] =
					await tx`select 1 from menu_products where slug = ${slug} and sku <> ${p.sku}`;
				if (!hit) {
					p.slug = slug;
					break;
				}
			}
		}
		await importCatalog(catalog, actor, tx);
	});
	return { products: catalog.products.length, categories: catalog.categories.length };
}
