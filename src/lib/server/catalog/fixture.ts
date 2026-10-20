// Demo menu used in local development and tests, and as the catalog when no
// CMS is configured. Production reads the published menu from Directus.
import type { Catalog, ModifierGroup } from '#lib/domain/catalog.ts';

const point: ModifierGroup = {
	id: 'ponto',
	name: 'Ponto da carne',
	minSelections: 1,
	maxSelections: 1,
	options: [
		{ sku: 'PONTO-MAL', name: 'Mal passado', priceCents: 0, maxQuantity: 1 },
		{ sku: 'PONTO-AO', name: 'Ao ponto', priceCents: 0, maxQuantity: 1 },
		{ sku: 'PONTO-BEM', name: 'Bem passado', priceCents: 0, maxQuantity: 1 }
	]
};

const extras: ModifierGroup = {
	id: 'adicionais',
	name: 'Adicionais',
	minSelections: 0,
	maxSelections: 5,
	options: [
		{ sku: 'ADD-BACON', name: 'Bacon', priceCents: 500, maxQuantity: 2 },
		{ sku: 'ADD-CHEDDAR', name: 'Cheddar extra', priceCents: 400, maxQuantity: 2 },
		{ sku: 'ADD-BURGER', name: 'Hambúrguer extra', priceCents: 900, maxQuantity: 2 },
		{ sku: 'ADD-OVO', name: 'Ovo', priceCents: 300, maxQuantity: 1 }
	]
};

const removals: ModifierGroup = {
	id: 'retirar',
	name: 'Retirar',
	minSelections: 0,
	maxSelections: 4,
	options: [
		{ sku: 'SEM-PICLES', name: 'Sem picles', priceCents: 0, maxQuantity: 1 },
		{ sku: 'SEM-CEBOLA', name: 'Sem cebola', priceCents: 0, maxQuantity: 1 },
		{ sku: 'SEM-TOMATE', name: 'Sem tomate', priceCents: 0, maxQuantity: 1 },
		{ sku: 'SEM-MOLHO', name: 'Sem molho', priceCents: 0, maxQuantity: 1 }
	]
};

const drinkSize: ModifierGroup = {
	id: 'tamanho',
	name: 'Tamanho',
	minSelections: 1,
	maxSelections: 1,
	options: [
		{ sku: 'TAM-350', name: 'Lata 350 ml', priceCents: 0, maxQuantity: 1 },
		{ sku: 'TAM-600', name: 'Garrafa 600 ml', priceCents: 300, maxQuantity: 1 }
	]
};

const all = ['counter', 'web', 'ifood'] as const;

export const fixtureCatalog: Catalog = {
	version: 'fixture-1',
	categories: [
		{ id: 'burgers', slug: 'burgers', name: 'Burgers', position: 1 },
		{ id: 'acompanhamentos', slug: 'acompanhamentos', name: 'Acompanhamentos', position: 2 },
		{ id: 'bebidas', slug: 'bebidas', name: 'Bebidas', position: 3 }
	],
	products: [
		{
			sku: 'BRG-CLASSICO',
			slug: 'classico',
			name: 'Clássico',
			description: 'Blend 160 g, queijo prato, alface, tomate, picles e molho da casa.',
			imageUrl: null,
			categoryId: 'burgers',
			priceCents: 2890,
			prepStation: 'grill',
			channels: [...all],
			allergens: ['glúten', 'lactose'],
			modifierGroups: [point, extras, removals]
		},
		{
			sku: 'BRG-BACON',
			slug: 'bacon-cheddar',
			name: 'Bacon Cheddar',
			description: 'Blend 160 g, cheddar cremoso, bacon crocante e cebola caramelizada.',
			imageUrl: null,
			categoryId: 'burgers',
			priceCents: 3490,
			prepStation: 'grill',
			channels: [...all],
			allergens: ['glúten', 'lactose'],
			modifierGroups: [point, extras, removals]
		},
		{
			sku: 'BRG-DUPLO',
			slug: 'duplo-smash',
			name: 'Duplo Smash',
			description: 'Dois smash de 90 g, queijo americano em dobro e molho especial.',
			imageUrl: null,
			categoryId: 'burgers',
			priceCents: 3290,
			prepStation: 'grill',
			channels: [...all],
			allergens: ['glúten', 'lactose'],
			modifierGroups: [extras, removals]
		},
		{
			sku: 'BRG-VEG',
			slug: 'veggie',
			name: 'Veggie',
			description: 'Burger de grão-de-bico, queijo, rúcula, tomate e maionese de ervas.',
			imageUrl: null,
			categoryId: 'burgers',
			priceCents: 2990,
			prepStation: 'grill',
			channels: [...all],
			allergens: ['glúten', 'lactose'],
			modifierGroups: [removals]
		},
		{
			sku: 'ACP-FRITAS',
			slug: 'batata-frita',
			name: 'Batata frita',
			description: 'Porção individual com sal e páprica.',
			imageUrl: null,
			categoryId: 'acompanhamentos',
			priceCents: 1490,
			prepStation: 'fryer',
			channels: [...all],
			allergens: [],
			modifierGroups: []
		},
		{
			sku: 'ACP-ONION',
			slug: 'onion-rings',
			name: 'Onion rings',
			description: 'Anéis de cebola empanados com molho barbecue.',
			imageUrl: null,
			categoryId: 'acompanhamentos',
			priceCents: 1690,
			prepStation: 'fryer',
			channels: [...all],
			allergens: ['glúten'],
			modifierGroups: []
		},
		{
			sku: 'BEB-REFRI',
			slug: 'refrigerante',
			name: 'Refrigerante',
			description: 'Coca-Cola, Guaraná ou Sprite.',
			imageUrl: null,
			categoryId: 'bebidas',
			priceCents: 690,
			prepStation: 'counter',
			channels: [...all],
			allergens: [],
			modifierGroups: [drinkSize]
		},
		{
			sku: 'BEB-SUCO',
			slug: 'suco-natural',
			name: 'Suco natural',
			description: 'Laranja ou limão, 400 ml.',
			imageUrl: null,
			categoryId: 'bebidas',
			priceCents: 990,
			prepStation: 'counter',
			channels: ['counter', 'web'],
			allergens: [],
			modifierGroups: []
		}
	]
};
