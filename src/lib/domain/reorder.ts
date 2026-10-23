// "Pedir de novo": turns a past order back into cart lines from today's menu.
// Prices come from the current catalog (the server re-prices at checkout anyway), and a
// line whose product, choices or removals no longer exist is left out rather than
// guessed, so the customer never gets something they did not pick.
import { REMOVE_GROUP, type Product } from './catalog';

export interface PastModifier {
	groupName: string;
	/** Null for a removal ("Sem cebola"), which is stored by its label. */
	optionSku: string | null;
	optionName: string;
	quantity: number;
}

export interface PastItem {
	sku: string;
	name: string;
	quantity: number;
	note: string | null;
	modifiers: PastModifier[];
}

export interface ReorderOption {
	groupId: string;
	sku: string;
	name: string;
	priceCents: number;
	quantity: number;
}

export interface ReorderLine {
	product: Product;
	quantity: number;
	options: ReorderOption[];
	note: string;
}

export function rebuildOrder(
	items: PastItem[],
	products: Product[],
	soldOut: Set<string>,
	missingIngredients: Set<string>
): { lines: ReorderLine[]; skipped: string[] } {
	const lines: ReorderLine[] = [];
	const skipped: string[] = [];
	for (const item of items) {
		const product = products.find((p) => p.sku === item.sku);
		const options = product && !soldOut.has(product.sku) ? rebuildOptions(item, product) : null;
		if (!product || !options || !stillMakeable(product, options, soldOut, missingIngredients)) {
			skipped.push(item.name);
			continue;
		}
		lines.push({ product, quantity: item.quantity, options, note: item.note ?? '' });
	}
	return { lines, skipped };
}

function rebuildOptions(item: PastItem, product: Product): ReorderOption[] | null {
	const options: ReorderOption[] = [];
	for (const m of item.modifiers) {
		if (m.optionSku === null) {
			const ingredient = product.ingredients.find(
				(i) => i.removable && `Sem ${i.name.toLowerCase()}` === m.optionName
			);
			if (!ingredient) return null;
			options.push({
				groupId: REMOVE_GROUP,
				sku: ingredient.id,
				name: m.optionName,
				priceCents: 0,
				quantity: 1
			});
			continue;
		}
		// Prefer the group with the same name; an option moved to another group still counts.
		const groups = [...product.modifierGroups].sort(
			(a, b) => Number(b.name === m.groupName) - Number(a.name === m.groupName)
		);
		const group = groups.find((g) => g.options.some((o) => o.sku === m.optionSku));
		const option = group?.options.find((o) => o.sku === m.optionSku);
		if (!group || !option) return null;
		options.push({
			groupId: group.id,
			sku: option.sku,
			name: option.name,
			priceCents: option.priceCents,
			quantity: Math.min(m.quantity, option.maxQuantity)
		});
	}
	return options;
}

function stillMakeable(
	product: Product,
	options: ReorderOption[],
	soldOut: Set<string>,
	missingIngredients: Set<string>
): boolean {
	if (options.some((o) => o.groupId !== REMOVE_GROUP && soldOut.has(o.sku))) return false;
	for (const g of product.modifierGroups) {
		const picked = options.filter((o) => o.groupId === g.id).reduce((n, o) => n + o.quantity, 0);
		if (picked < g.minSelections || picked > g.maxSelections) return false;
	}
	// An ingredient that ran out today must be left out; the customer chooses on the dish page.
	const removed = new Set(options.filter((o) => o.groupId === REMOVE_GROUP).map((o) => o.sku));
	return !product.ingredients.some((i) => missingIngredients.has(i.id) && !removed.has(i.id));
}
