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

/** What a product is made of. Removable ones can be left out by the customer ("sem cebola"). */
export interface ProductIngredient {
	id: string;
	name: string;
	removable: boolean;
}

/**
 * Removed ingredients travel in a cart line's options under this group id. Real
 * group ids cannot start with "_", so it never clashes with one.
 */
export const REMOVE_GROUP = '_sem';

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
	/** The product's own allergens plus those of its ingredients. */
	allergens: string[];
	ingredients: ProductIngredient[];
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

/**
 * Why a product cannot be ordered right now, or null. A product is out when it is
 * sold out itself or when an ingredient it cannot be made without has run out.
 */
export function unavailableReason(
	product: Product,
	soldOut: Set<string>,
	missingIngredients: Set<string>
): string | null {
	if (soldOut.has(product.sku)) return 'Esgotado';
	const missing = product.ingredients.find((i) => !i.removable && missingIngredients.has(i.id));
	return missing ? `Sem ${missing.name.toLowerCase()} hoje` : null;
}
