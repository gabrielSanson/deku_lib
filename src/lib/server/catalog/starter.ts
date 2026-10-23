// The Deku Lib starting menu: one category and one product with nothing in it about
// any kind of shop, so a new store sees how the menu works and renames it.
import type { Catalog } from '#lib/domain/catalog.ts';

export const starterCatalog: Catalog = {
	version: 'starter-1',
	categories: [{ id: 'produtos', slug: 'produtos', name: 'Produtos', position: 1, imageUrl: null }],
	products: [
		{
			sku: 'ITEM-1',
			slug: 'meu-produto',
			name: 'Meu produto',
			description: 'Troque o nome, o preço, a descrição e a foto em Cardápio.',
			imageUrl: null,
			categoryId: 'produtos',
			priceCents: 1000,
			prepStation: 'counter',
			channels: ['counter', 'web', 'ifood'],
			allergens: [],
			ingredients: [],
			modifierGroups: []
		}
	]
};
