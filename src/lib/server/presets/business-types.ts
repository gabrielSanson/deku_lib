// What a new hosted shop starts with, by business type: a small starting menu, a few wording
// changes (the neutral defaults name no food), which ways of ordering start on, and the NCM the
// accountant usually confirms. The owner changes all of it in Cardápio and Configurações.
import type { Catalog, Product } from '#lib/domain/catalog.ts';
import type { BusinessType } from '#lib/domain/signup.ts';
import type { TextKey } from '#lib/texts/catalog.ts';
import { SYSTEM } from '../audit';
import { importCatalog } from '../catalog/editor';
import type { Db } from '../db';

export interface BusinessTypeStart {
	label: string;
	catalog: Catalog;
	texts: Partial<Record<TextKey, string>>;
	modes: { delivery: boolean; pickup: boolean; dineIn: boolean };
	/** Usual NCM for the main products; the accountant confirms it before notes are issued. */
	suggestedNcm: string;
}

function product(
	sku: string,
	name: string,
	categoryId: string,
	priceCents: number,
	description = '',
	prepStation = 'counter'
): Product {
	return {
		sku,
		slug: sku.toLowerCase(),
		name,
		description,
		imageUrl: null,
		categoryId,
		priceCents,
		prepStation,
		channels: ['counter', 'web', 'ifood'],
		allergens: [],
		ingredients: [],
		modifierGroups: []
	};
}

function catalog(version: string, categories: [string, string][], products: Product[]): Catalog {
	return {
		version,
		categories: categories.map(([id, name], i) => ({
			id,
			slug: id,
			name,
			position: i + 1,
			imageUrl: null
		})),
		products
	};
}

const drinks = (prefix: string) => [
	product(`${prefix}-AGUA`, 'Água mineral 500 ml', 'bebidas', 400),
	product(`${prefix}-REFRI`, 'Refrigerante lata', 'bebidas', 650)
];

export const BUSINESS_TYPE_STARTS: Record<BusinessType, BusinessTypeStart> = {
	lanchonete: {
		label: 'Lanchonete',
		catalog: catalog(
			'tipo-lanchonete-1',
			[
				['lanches', 'Lanches'],
				['porcoes', 'Porções'],
				['bebidas', 'Bebidas']
			],
			[
				product(
					'LAN-MISTO',
					'Misto quente',
					'lanches',
					1200,
					'Pão de forma, presunto e queijo.',
					'grill'
				),
				product(
					'LAN-XSALADA',
					'X-salada',
					'lanches',
					1990,
					'Hambúrguer, queijo, alface e tomate.',
					'grill'
				),
				product('POR-FRITAS', 'Batata frita', 'porcoes', 1500, '', 'fryer'),
				...drinks('BEB')
			]
		),
		texts: {
			'home.metaDescription': 'Peça seus lanches online para retirada ou entrega.',
			'menuEdit.emptyText':
				'Crie uma categoria (por exemplo "Lanches") e depois os produtos, com preço e foto.'
		},
		modes: { delivery: true, pickup: true, dineIn: true },
		suggestedNcm: '21069090'
	},
	hamburgueria: {
		label: 'Hamburgueria',
		catalog: catalog(
			'tipo-hamburgueria-1',
			[
				['burgers', 'Burgers'],
				['acompanhamentos', 'Acompanhamentos'],
				['bebidas', 'Bebidas']
			],
			[
				product(
					'BRG-CLASSICO',
					'Burger clássico',
					'burgers',
					2890,
					'Pão, carne 160 g, queijo e salada.',
					'grill'
				),
				product(
					'BRG-BACON',
					'Burger bacon',
					'burgers',
					3290,
					'Pão, carne 160 g, queijo e bacon.',
					'grill'
				),
				product('ACP-FRITAS', 'Fritas', 'acompanhamentos', 1490, '', 'fryer'),
				...drinks('BEB')
			]
		),
		texts: {
			'home.metaDescription': 'Peça seus burgers online para retirada ou entrega.',
			'group.minHint': '0 = opcional. 1 = obrigatório (ex.: ponto da carne).'
		},
		modes: { delivery: true, pickup: true, dineIn: true },
		suggestedNcm: '21069090'
	},
	pizzaria: {
		label: 'Pizzaria',
		catalog: catalog(
			'tipo-pizzaria-1',
			[
				['pizzas', 'Pizzas'],
				['bebidas', 'Bebidas']
			],
			[
				product(
					'PIZ-MUSSARELA',
					'Pizza mussarela',
					'pizzas',
					4990,
					'Molho de tomate, mussarela e orégano.',
					'grill'
				),
				product(
					'PIZ-CALABRESA',
					'Pizza calabresa',
					'pizzas',
					5290,
					'Molho de tomate, calabresa e cebola.',
					'grill'
				),
				...drinks('BEB')
			]
		),
		texts: {
			'home.metaDescription': 'Peça sua pizza online para retirada ou entrega.',
			'group.minHint': '0 = opcional. 1 = obrigatório (ex.: tamanho da pizza).'
		},
		modes: { delivery: true, pickup: true, dineIn: false },
		suggestedNcm: '19059090'
	},
	acai: {
		label: 'Açaí',
		catalog: catalog(
			'tipo-acai-1',
			[
				['acai', 'Açaí'],
				['bebidas', 'Bebidas']
			],
			[
				product('ACA-300', 'Açaí 300 ml', 'acai', 1600, 'Escolha os complementos.'),
				product('ACA-500', 'Açaí 500 ml', 'acai', 2200, 'Escolha os complementos.'),
				...drinks('BEB')
			]
		),
		texts: {
			'home.metaDescription': 'Peça seu açaí online para retirada ou entrega.',
			'group.minHint': '0 = opcional. 1 = obrigatório (ex.: tamanho do copo).'
		},
		modes: { delivery: true, pickup: true, dineIn: false },
		suggestedNcm: '21050010'
	},
	cafeteria: {
		label: 'Cafeteria',
		catalog: catalog(
			'tipo-cafeteria-1',
			[
				['cafes', 'Cafés'],
				['salgados', 'Salgados'],
				['doces', 'Doces']
			],
			[
				product('CAF-EXPRESSO', 'Café expresso', 'cafes', 600, '', 'bar'),
				product('CAF-CAPUCCINO', 'Cappuccino', 'cafes', 1100, '', 'bar'),
				product('SAL-PAOQUEIJO', 'Pão de queijo', 'salgados', 700),
				product('DOC-BOLO', 'Fatia de bolo', 'doces', 1200)
			]
		),
		texts: { 'home.metaDescription': 'Peça online e retire no balcão.' },
		modes: { delivery: false, pickup: true, dineIn: true },
		suggestedNcm: '21011110'
	},
	restaurante: {
		label: 'Restaurante',
		catalog: catalog(
			'tipo-restaurante-1',
			[
				['pratos', 'Pratos'],
				['bebidas', 'Bebidas']
			],
			[
				product(
					'PRA-EXECUTIVO',
					'Prato executivo',
					'pratos',
					3200,
					'Arroz, feijão, salada e a carne do dia.',
					'grill'
				),
				product('PRA-SALADA', 'Salada da casa', 'pratos', 2600),
				...drinks('BEB')
			]
		),
		texts: { 'home.metaDescription': 'Peça online para retirada ou entrega.' },
		modes: { delivery: true, pickup: true, dineIn: true },
		suggestedNcm: '21069090'
	}
};

/** Gives the current shop the starting menu, wording, modes and NCM of its business type. */
export async function applyBusinessType(type: BusinessType, sql: Db) {
	const start = BUSINESS_TYPE_STARTS[type];
	await importCatalog(start.catalog, SYSTEM, sql);
	for (const [key, value] of Object.entries(start.texts)) {
		await sql`insert into ui_texts (key, value) values (${key}, ${value})
			on conflict (shop_id, key) do nothing`;
	}
	await sql`update store_runtime_settings set delivery_enabled = ${start.modes.delivery},
		pickup_enabled = ${start.modes.pickup}, dine_in_enabled = ${start.modes.dineIn}
		where shop_id = current_shop_id()`;
	await sql`update fiscal_settings set default_ncm = coalesce(default_ncm, ${start.suggestedNcm})
		where shop_id = current_shop_id()`;
}
