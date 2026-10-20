// Catalog shape shared by the menu tables, the sample menu and pricing.
// Prices are integer centavos.

export type Channel = 'counter' | 'web' | 'ifood';

export interface ModifierOption {
	sku: string;
	name: string;
	priceCents: number;
	/** How many times this option may be picked within its group. */
	maxQuantity: number;
}

export interface ModifierGroup {
	id: string;
	name: string;
	minSelections: number;
	maxSelections: number;
	options: ModifierOption[];
}

export interface Product {
	sku: string;
	slug: string;
	name: string;
	description: string;
	imageUrl: string | null;
	categoryId: string;
	priceCents: number;
	prepStation: string;
	channels: Channel[];
	allergens: string[];
	modifierGroups: ModifierGroup[];
}

export interface Category {
	id: string;
	slug: string;
	name: string;
	position: number;
}

export interface Catalog {
	version: string;
	categories: Category[];
	products: Product[];
}

export function productBySku(catalog: Catalog, sku: string): Product | undefined {
	return catalog.products.find((p) => p.sku === sku);
}
