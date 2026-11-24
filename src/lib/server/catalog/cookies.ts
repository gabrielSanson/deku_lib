// Sample menu of the cookie preset: single cookies, boxes where the customer picks the
// flavours (a box of 6 needs exactly 6 picks, repeats allowed) and drinks to go with them.
// The pictures are illustrations in static/presets/cookie/products, until the owner uploads photos.
import type { Catalog, ModifierGroup, Product } from '#lib/domain/catalog.ts';

const img = (name: string) => `/presets/cookie/products/${name}.svg`;
const channels: Product['channels'] = ['counter', 'web'];

interface Flavour {
	code: string;
	slug: string;
	name: string;
	description: string;
	priceCents: number;
	category: 'classicos' | 'recheados';
	allergens: string[];
	/** Extra charge when picked inside a box. */
	boxExtraCents: number;
}

const FLAVOURS: Flavour[] = [
	{
		code: 'TRAD',
		slug: 'tradicional',
		name: 'Tradicional',
		description: 'Massa amanteigada, borda crocante e muitas gotas de chocolate meio amargo.',
		priceCents: 1200,
		category: 'classicos',
		allergens: ['glúten', 'lactose', 'ovo'],
		boxExtraCents: 0
	},
	{
		code: 'DUPLO',
		slug: 'duplo-chocolate',
		name: 'Duplo chocolate',
		description: 'Massa de cacau com pedaços de chocolate ao leite e meio amargo.',
		priceCents: 1350,
		category: 'classicos',
		allergens: ['glúten', 'lactose', 'ovo'],
		boxExtraCents: 0
	},
	{
		code: 'RV',
		slug: 'red-velvet',
		name: 'Red velvet',
		description: 'Massa red velvet macia com gotas de chocolate branco.',
		priceCents: 1450,
		category: 'classicos',
		allergens: ['glúten', 'lactose', 'ovo'],
		boxExtraCents: 0
	},
	{
		code: 'AVEIA',
		slug: 'aveia-e-mel',
		name: 'Aveia e mel',
		description: 'Aveia, mel, castanha-do-pará e um toque de canela.',
		priceCents: 1250,
		category: 'classicos',
		allergens: ['glúten', 'lactose', 'ovo', 'castanhas'],
		boxExtraCents: 0
	},
	{
		code: 'AVELA',
		slug: 'recheado-de-avela',
		name: 'Recheado de avelã',
		description: 'Cookie tradicional com coração cremoso de creme de avelã.',
		priceCents: 1690,
		category: 'recheados',
		allergens: ['glúten', 'lactose', 'ovo', 'castanhas'],
		boxExtraCents: 300
	},
	{
		code: 'DDL',
		slug: 'recheado-de-doce-de-leite',
		name: 'Recheado de doce de leite',
		description: 'Massa amanteigada com doce de leite e flor de sal.',
		priceCents: 1590,
		category: 'recheados',
		allergens: ['glúten', 'lactose', 'ovo'],
		boxExtraCents: 300
	},
	{
		code: 'PIST',
		slug: 'pistache',
		name: 'Pistache',
		description: 'Massa de pistache com chocolate branco e recheio de creme de pistache.',
		priceCents: 1790,
		category: 'recheados',
		allergens: ['glúten', 'lactose', 'ovo', 'castanhas'],
		boxExtraCents: 400
	}
];

const warm: ModifierGroup = {
	id: 'servir',
	name: 'Como servir',
	minSelections: 0,
	maxSelections: 1,
	options: [
		{ sku: 'SERV-QUENTE', name: 'Quentinho (aquecido na hora)', priceCents: 0, maxQuantity: 1 }
	]
};

function flavourPicks(size: number): ModifierGroup {
	return {
		id: `sabores-${size}`,
		name: `Escolha ${size} sabores`,
		minSelections: size,
		maxSelections: size,
		options: FLAVOURS.map((f) => ({
			sku: `CX${size}-${f.code}`,
			name: f.name,
			priceCents: f.boxExtraCents,
			maxQuantity: size,
			imageUrl: img(f.slug)
		}))
	};
}

const BOXES: { size: number; priceCents: number; description: string }[] = [
	{
		size: 4,
		priceCents: 4600,
		description: 'Quatro cookies à sua escolha numa caixa para presente.'
	},
	{
		size: 6,
		priceCents: 6700,
		description: 'Seis cookies à sua escolha. A favorita para dividir.'
	},
	{
		size: 12,
		priceCents: 12900,
		description: 'Uma dúzia de cookies à sua escolha, para a festa toda.'
	}
];

const ALL_ALLERGENS = [...new Set(FLAVOURS.flatMap((f) => f.allergens))];

function drink(
	sku: string,
	slug: string,
	name: string,
	priceCents: number,
	description: string,
	allergens: string[] = []
): Product {
	return {
		sku,
		slug,
		name,
		description,
		imageUrl: img(slug),
		categoryId: 'bebidas',
		priceCents,
		prepStation: 'counter',
		channels,
		allergens,
		ingredients: [],
		modifierGroups: []
	};
}

export const cookieCatalog: Catalog = {
	version: 'cookies-1',
	categories: [
		{ id: 'classicos', slug: 'classicos', name: 'Cookies clássicos', position: 1, imageUrl: null },
		{ id: 'recheados', slug: 'recheados', name: 'Cookies recheados', position: 2, imageUrl: null },
		{ id: 'caixas', slug: 'caixas', name: 'Caixas', position: 3, imageUrl: null },
		{ id: 'bebidas', slug: 'bebidas', name: 'Bebidas', position: 4, imageUrl: null }
	],
	products: [
		...FLAVOURS.map((f): Product => ({
			sku: `COOKIE-${f.code}`,
			slug: f.slug,
			name: f.name,
			description: f.description,
			imageUrl: img(f.slug),
			categoryId: f.category,
			priceCents: f.priceCents,
			prepStation: 'counter',
			channels,
			allergens: f.allergens,
			ingredients: [],
			modifierGroups: [warm]
		})),
		...BOXES.map((b): Product => ({
			sku: `CAIXA-${b.size}`,
			slug: `caixa-${b.size}`,
			name: `Caixa com ${b.size}`,
			description: b.description,
			imageUrl: img(`caixa-${b.size}`),
			categoryId: 'caixas',
			priceCents: b.priceCents,
			prepStation: 'counter',
			channels,
			allergens: ALL_ALLERGENS,
			ingredients: [],
			modifierGroups: [flavourPicks(b.size)]
		})),
		drink(
			'BEB-LEITE',
			'leite-gelado',
			'Leite gelado',
			700,
			'Copo de 300 ml, o par perfeito do cookie.',
			['lactose']
		),
		drink('BEB-CAFE', 'cafe-coado', 'Café coado', 600, 'Café especial coado na hora, 200 ml.'),
		drink('BEB-CHOC', 'chocolate-quente', 'Chocolate quente', 1100, 'Chocolate cremoso, 250 ml.', [
			'lactose'
		])
	]
};
