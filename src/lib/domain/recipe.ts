// Ficha técnica: what one sold line uses from stock, and what that costs. Pure, so the stock job,
// the profit report and the product editor all count the same way.

export interface RecipeLine {
	/** Exactly one of productSku / optionSku is set. */
	productSku: string | null;
	optionSku: string | null;
	stockItemId: string;
	/** Base units (g, ml, un) per one product or one option. */
	qtyBase: number;
	/** Leaving this ingredient out ("Sem cebola") skips the line. */
	ingredientId: string | null;
}

export interface SoldLine {
	productSku: string;
	quantity: number;
	options: { sku: string; quantity: number }[];
	/** Ingredient ids the customer left out. */
	removed: string[];
}

/** Rounds to the nearest integer, halves to even (R$0,535 → R$0,54; R$0,525 → R$0,52). */
export function roundHalfEven(x: number): number {
	const r = Math.round(x);
	const diff = Math.abs(x % 1);
	// Within floating error of exactly .5: go to the even neighbour.
	if (Math.abs(diff - 0.5) < 1e-9) {
		const down = Math.floor(x);
		return down % 2 === 0 ? down : down + 1;
	}
	return r;
}

/**
 * Stock used by one sold line, by stock item id. Null when the product has no recipe: the line
 * is then "sem ficha técnica", never counted as zero cost.
 */
export function expandRecipe(line: SoldLine, recipes: RecipeLine[]): Map<string, number> | null {
	const own = recipes.filter((r) => r.productSku === line.productSku);
	if (own.length === 0) return null;
	const removed = new Set(line.removed);
	const usage = new Map<string, number>();
	const add = (id: string, qty: number) => usage.set(id, (usage.get(id) ?? 0) + qty);
	for (const r of own) {
		if (r.ingredientId && removed.has(r.ingredientId)) continue;
		add(r.stockItemId, r.qtyBase * line.quantity);
	}
	for (const o of line.options) {
		for (const r of recipes.filter((x) => x.optionSku === o.sku))
			add(r.stockItemId, r.qtyBase * o.quantity * line.quantity);
	}
	return usage;
}

/** Cost in centavos of the stock used, at each item's cost (centavos × 10^6 per base unit). */
export function recipeCostCents(
	usage: Map<string, number>,
	costMicro: Map<string, number>
): number {
	let micro = 0;
	for (const [id, qty] of usage) micro += qty * (costMicro.get(id) ?? 0);
	return roundHalfEven(micro / 1_000_000);
}

/** Weighted average cost after a purchase. Negative stock counts as zero on hand. */
export function averageCostMicro(
	onHand: number,
	avgMicro: number,
	boughtQty: number,
	boughtTotalCents: number
): number {
	const held = Math.max(onHand, 0);
	const total = held * avgMicro + boughtTotalCents * 1_000_000;
	return held + boughtQty > 0 ? Math.round(total / (held + boughtQty)) : avgMicro;
}
