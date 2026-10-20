// Customer cart, kept in localStorage so it survives reloads and accidental
// navigation. Prices are only a preview: the server re-prices at checkout.
import type { Product } from '#lib/domain/catalog.ts';

export interface StoredOption {
	groupId: string;
	sku: string;
	name: string;
	priceCents: number;
	quantity: number;
}

export interface StoredLine {
	key: string;
	sku: string;
	name: string;
	unitCents: number;
	quantity: number;
	options: StoredOption[];
	note: string;
}

const KEY = 'deku-cart-v1';

function load(): StoredLine[] {
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as StoredLine[]) : [];
	} catch {
		return [];
	}
}

class Cart {
	lines = $state<StoredLine[]>([]);
	ready = $state(false);

	init() {
		if (this.ready) return;
		this.lines = load();
		this.ready = true;
	}

	private save() {
		try {
			localStorage.setItem(KEY, JSON.stringify(this.lines));
		} catch {
			/* private mode: cart still works for this visit */
		}
	}

	get count() {
		return this.lines.reduce((n, l) => n + l.quantity, 0);
	}

	get subtotalCents() {
		return this.lines.reduce((n, l) => n + l.unitCents * l.quantity, 0);
	}

	add(product: Product, quantity: number, options: StoredOption[], note: string) {
		const unitCents = product.priceCents + options.reduce((n, o) => n + o.priceCents * o.quantity, 0);
		const same = this.lines.find(
			(l) => l.sku === product.sku && l.note === note && JSON.stringify(l.options) === JSON.stringify(options)
		);
		if (same) same.quantity = Math.min(50, same.quantity + quantity);
		else
			this.lines.push({ key: crypto.randomUUID(), sku: product.sku, name: product.name, unitCents, quantity, options, note });
		this.save();
	}

	setQuantity(key: string, quantity: number) {
		this.lines = quantity <= 0 ? this.lines.filter((l) => l.key !== key) : this.lines.map((l) => (l.key === key ? { ...l, quantity } : l));
		this.save();
	}

	clear() {
		this.lines = [];
		this.save();
	}

	payload() {
		return this.lines.map((l) => ({
			sku: l.sku,
			quantity: l.quantity,
			note: l.note || undefined,
			options: l.options.map((o) => ({ groupId: o.groupId, sku: o.sku, quantity: o.quantity }))
		}));
	}
}

export const cart = new Cart();
