// Server-side cart pricing. The client sends SKUs, quantities and chosen
// options; every price comes from the catalog, never from the client.
import { z } from 'zod';
import { fill, TEXTS, type TextKey } from '#lib/texts/catalog.ts';
import { productBySku, REMOVE_GROUP, type Catalog, type Channel } from './catalog';

export const cartLineInput = z.object({
	sku: z.string().min(1),
	quantity: z.number().int().min(1).max(50),
	note: z.string().trim().max(200).optional(),
	allergy: z.boolean().optional(),
	options: z
		.array(
			z.object({
				groupId: z.string(),
				sku: z.string(),
				quantity: z.number().int().min(1).max(10).default(1)
			})
		)
		.default([])
});
export type CartLineInput = z.input<typeof cartLineInput>;

export interface PricedModifier {
	groupName: string;
	/** Null for removed ingredients ("Sem cebola"), which are not sold items. */
	optionSku: string | null;
	optionName: string;
	quantity: number;
	unitPriceCents: number;
}

export interface PricedLine {
	position: number;
	productSku: string;
	productName: string;
	categoryName: string | null;
	quantity: number;
	unitPriceCents: number;
	modifiersUnitCents: number;
	lineTotalCents: number;
	note: string | null;
	allergyFlag: boolean;
	prepStation: string;
	modifiers: PricedModifier[];
}

export interface PricedCart {
	catalogVersion: string;
	lines: PricedLine[];
	subtotalCents: number;
}

/** A cart the shop cannot sell as sent. `key` names the message in the text catalog. */
export class PricingError extends Error {
	readonly vars: Record<string, string | number>;
	readonly sku?: string;

	constructor(
		readonly key: TextKey,
		{ vars = {}, sku }: { vars?: Record<string, string | number>; sku?: string } = {}
	) {
		super(fill(TEXTS[key].default, vars));
		this.vars = vars;
		this.sku = sku;
	}
}

export interface PricingContext {
	channel: Channel;
	/** SKUs currently sold out for this channel (app-owned overrides). */
	soldOut: Set<string>;
	/** Ingredients that ran out today. */
	missingIngredients?: Set<string>;
}

export function priceCart(
	catalog: Catalog,
	rawLines: CartLineInput[],
	ctx: PricingContext
): PricedCart {
	if (rawLines.length === 0) throw new PricingError('err.cart.empty');
	if (rawLines.length > 60) throw new PricingError('err.cart.tooMany');

	const lines = rawLines.map((raw, index) => {
		const input = cartLineInput.parse(raw);
		const product = productBySku(catalog, input.sku);
		if (!product || !product.channels.includes(ctx.channel)) {
			throw new PricingError('err.cart.unavailable', { sku: input.sku });
		}
		if (ctx.soldOut.has(product.sku)) {
			throw new PricingError('err.cart.soldOut', {
				vars: { name: product.name },
				sku: product.sku
			});
		}

		const modifiers: PricedModifier[] = [];
		for (const group of product.modifierGroups) {
			const picked = input.options.filter((o) => o.groupId === group.id);
			const count = picked.reduce((n, o) => n + o.quantity, 0);
			if (count < group.minSelections) {
				throw new PricingError('err.cart.pickOption', {
					vars: { group: group.name, product: product.name },
					sku: product.sku
				});
			}
			if (count > group.maxSelections) {
				throw new PricingError('err.cart.tooManyOptions', {
					vars: { group: group.name },
					sku: product.sku
				});
			}
			for (const choice of picked) {
				const option = group.options.find((o) => o.sku === choice.sku);
				if (!option) throw new PricingError('err.cart.badOption', { sku: product.sku });
				if (ctx.soldOut.has(option.sku)) {
					throw new PricingError('err.cart.soldOut', {
						vars: { name: option.name },
						sku: option.sku
					});
				}
				if (choice.quantity > option.maxQuantity) {
					throw new PricingError('err.cart.badQuantity', {
						vars: { name: option.name },
						sku: product.sku
					});
				}
				modifiers.push({
					groupName: group.name,
					optionSku: option.sku,
					optionName: option.name,
					quantity: choice.quantity,
					unitPriceCents: option.priceCents
				});
			}
		}
		const removed = new Set(
			input.options.filter((o) => o.groupId === REMOVE_GROUP).map((o) => o.sku)
		);
		for (const id of removed) {
			const ingredient = product.ingredients.find((i) => i.id === id && i.removable);
			if (!ingredient) throw new PricingError('err.cart.badOption', { sku: product.sku });
			modifiers.push({
				groupName: 'Retirar',
				optionSku: null,
				optionName: `Sem ${ingredient.name.toLowerCase()}`,
				quantity: 1,
				unitPriceCents: 0
			});
		}
		for (const ingredient of product.ingredients) {
			if (!ctx.missingIngredients?.has(ingredient.id) || removed.has(ingredient.id)) continue;
			throw ingredient.removable
				? new PricingError('err.cart.ingredientOut', {
						vars: { ingredient: ingredient.name, product: product.name },
						sku: product.sku
					})
				: new PricingError('err.cart.soldOut', { vars: { name: product.name }, sku: product.sku });
		}
		const unknownGroup = input.options.find(
			(o) => o.groupId !== REMOVE_GROUP && !product.modifierGroups.some((g) => g.id === o.groupId)
		);
		if (unknownGroup) throw new PricingError('err.cart.badOption', { sku: product.sku });

		const modifiersUnitCents = modifiers.reduce((n, m) => n + m.unitPriceCents * m.quantity, 0);
		const category = catalog.categories.find((c) => c.id === product.categoryId);
		return {
			position: index + 1,
			productSku: product.sku,
			productName: product.name,
			categoryName: category?.name ?? null,
			quantity: input.quantity,
			unitPriceCents: product.priceCents,
			modifiersUnitCents,
			lineTotalCents: input.quantity * (product.priceCents + modifiersUnitCents),
			note: input.note || null,
			allergyFlag: input.allergy ?? false,
			prepStation: product.prepStation,
			modifiers
		} satisfies PricedLine;
	});

	return {
		catalogVersion: catalog.version,
		lines,
		subtotalCents: lines.reduce((n, l) => n + l.lineTotalCents, 0)
	};
}

export interface DeliveryRule {
	id: string;
	name: string;
	matchKind: 'cep_prefix' | 'neighborhood';
	matchValue: string;
	feeCents: number;
	minOrderCents: number;
	enabled: boolean;
	priority: number;
}

export function normalizeCep(cep: string): string {
	return cep.replace(/\D/g, '');
}

function normalizeText(s: string): string {
	return s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

/** Picks the delivery rule for an address: lowest priority number wins, CEP prefix before neighborhood. */
export function matchDeliveryRule(
	rules: DeliveryRule[],
	address: { cep: string; neighborhood: string }
): DeliveryRule | null {
	const cep = normalizeCep(address.cep);
	const hood = normalizeText(address.neighborhood);
	const candidates = rules
		.filter((r) => r.enabled)
		.filter((r) =>
			r.matchKind === 'cep_prefix'
				? cep.startsWith(normalizeCep(r.matchValue))
				: normalizeText(r.matchValue) === hood
		)
		.sort(
			(a, b) =>
				a.priority - b.priority ||
				(a.matchKind === b.matchKind ? 0 : a.matchKind === 'cep_prefix' ? -1 : 1) ||
				b.matchValue.length - a.matchValue.length
		);
	return candidates[0] ?? null;
}
