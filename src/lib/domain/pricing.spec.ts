import { describe, expect, it } from 'vitest';
import { fixtureCatalog } from '#lib/server/catalog/fixture.ts';
import { matchDeliveryRule, priceCart, PricingError, type DeliveryRule } from './pricing';

const ctx = { channel: 'counter' as const, soldOut: new Set<string>() };

describe('priceCart', () => {
	it('prices products and options from the catalog', () => {
		const cart = priceCart(
			fixtureCatalog,
			[
				{
					sku: 'BRG-CLASSICO',
					quantity: 2,
					options: [
						{ groupId: 'ponto', sku: 'PONTO-AO' },
						{ groupId: 'adicionais', sku: 'ADD-BACON', quantity: 2 }
					]
				},
				{ sku: 'ACP-FRITAS', quantity: 1 }
			],
			ctx
		);
		expect(cart.lines[0].modifiersUnitCents).toBe(1000);
		expect(cart.lines[0].lineTotalCents).toBe(2 * (2890 + 1000));
		expect(cart.subtotalCents).toBe(2 * 3890 + 1490);
		expect(cart.catalogVersion).toBe('fixture-1');
	});

	it('enforces required groups', () => {
		expect(() => priceCart(fixtureCatalog, [{ sku: 'BRG-CLASSICO', quantity: 1 }], ctx)).toThrow(
			PricingError
		);
	});

	it('rejects too many selections and per-option limits', () => {
		expect(() =>
			priceCart(
				fixtureCatalog,
				[
					{
						sku: 'BEB-REFRI',
						quantity: 1,
						options: [
							{ groupId: 'tamanho', sku: 'TAM-350' },
							{ groupId: 'tamanho', sku: 'TAM-600' }
						]
					}
				],
				ctx
			)
		).toThrow(/demais/);
		expect(() =>
			priceCart(
				fixtureCatalog,
				[
					{
						sku: 'BRG-DUPLO',
						quantity: 1,
						options: [{ groupId: 'adicionais', sku: 'ADD-OVO', quantity: 2 }]
					}
				],
				ctx
			)
		).toThrow(/Quantidade/);
	});

	it('rejects unknown options and groups', () => {
		expect(() =>
			priceCart(
				fixtureCatalog,
				[{ sku: 'ACP-FRITAS', quantity: 1, options: [{ groupId: 'x', sku: 'ADD-BACON' }] }],
				ctx
			)
		).toThrow(PricingError);
	});

	it('blocks sold-out items and channel-restricted products', () => {
		expect(() =>
			priceCart(fixtureCatalog, [{ sku: 'ACP-FRITAS', quantity: 1 }], {
				...ctx,
				soldOut: new Set(['ACP-FRITAS'])
			})
		).toThrow(/esgotado/);
		expect(() =>
			priceCart(fixtureCatalog, [{ sku: 'BEB-SUCO', quantity: 1 }], { ...ctx, channel: 'ifood' })
		).toThrow(/indisponível/);
	});

	it('rejects an empty cart', () => {
		expect(() => priceCart(fixtureCatalog, [], ctx)).toThrow(/vazio/);
	});
});

describe('matchDeliveryRule', () => {
	const rule = (over: Partial<DeliveryRule>): DeliveryRule => ({
		id: over.matchValue ?? 'r',
		name: 'r',
		matchKind: 'cep_prefix',
		matchValue: '01310',
		feeCents: 500,
		minOrderCents: 0,
		enabled: true,
		priority: 100,
		...over
	});

	it('matches CEP prefixes and neighborhoods ignoring accents', () => {
		const rules = [
			rule({ matchValue: '01310', feeCents: 600 }),
			rule({ matchKind: 'neighborhood', matchValue: 'Consolação', feeCents: 800 })
		];
		expect(matchDeliveryRule(rules, { cep: '01310-100', neighborhood: 'x' })?.feeCents).toBe(600);
		expect(
			matchDeliveryRule(rules, { cep: '99999-000', neighborhood: 'consolacao' })?.feeCents
		).toBe(800);
		expect(matchDeliveryRule(rules, { cep: '99999-000', neighborhood: 'outro' })).toBeNull();
	});

	it('prefers lower priority, then longer prefix, and skips disabled rules', () => {
		const rules = [
			rule({ matchValue: '013', feeCents: 900 }),
			rule({ matchValue: '01310', feeCents: 600 }),
			rule({ matchValue: '0131', feeCents: 100, enabled: false })
		];
		expect(matchDeliveryRule(rules, { cep: '01310100', neighborhood: '' })?.feeCents).toBe(600);
		rules.push(rule({ matchValue: '01', feeCents: 50, priority: 1 }));
		expect(matchDeliveryRule(rules, { cep: '01310100', neighborhood: '' })?.feeCents).toBe(50);
	});
});
