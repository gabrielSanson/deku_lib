// POS cart state. Prices shown here are previews; the server re-prices on submit.
import type { Product } from '#lib/domain/catalog.ts';

export interface CartOption {
	groupId: string;
	sku: string;
	name: string;
	priceCents: number;
	quantity: number;
}

export interface CartLine {
	key: string;
	product: Product;
	quantity: number;
	options: CartOption[];
	note: string;
	allergy: boolean;
}

export function lineUnitCents(line: Pick<CartLine, 'product' | 'options'>) {
	return line.product.priceCents + line.options.reduce((n, o) => n + o.priceCents * o.quantity, 0);
}

export function toPayload(lines: CartLine[]) {
	return lines.map((l) => ({
		sku: l.product.sku,
		quantity: l.quantity,
		note: l.note || undefined,
		allergy: l.allergy || undefined,
		options: l.options.map((o) => ({ groupId: o.groupId, sku: o.sku, quantity: o.quantity }))
	}));
}
