import { describe, expect, it } from 'vitest';
import { feeCents, findTerm, DEFAULT_TERMS } from './payment-fees';
import { orderProfit } from './profit';

describe('order profit', () => {
	it('reproduces the worked example: iFood vs the own site', () => {
		const ifood = orderProfit({
			totalCents: 4500,
			discountCents: 0,
			deliveryFeeCents: 0,
			channelCommissionBps: 1200,
			paymentFeesCents: feeCents(findTerm(DEFAULT_TERMS, 'ifood_collected', 'ifood'), 4500),
			deliveryCostCents: 0,
			foodCostCents: null
		});
		expect(ifood.commissionCents).toBe(540);
		expect(ifood.beforeFoodCents).toBe(3816);
		expect(ifood.netCents).toBeNull();

		const site = orderProfit({
			totalCents: 4500,
			discountCents: 0,
			deliveryFeeCents: 0,
			channelCommissionBps: 0,
			paymentFeesCents: feeCents(findTerm(DEFAULT_TERMS, 'pix', 'efi'), 4500),
			deliveryCostCents: 0,
			foodCostCents: 1500
		});
		expect(site.beforeFoodCents).toBe(4446);
		expect(site.beforeFoodCents - ifood.beforeFoodCents).toBe(630);
		expect(site.netCents).toBe(2946);
	});

	it('uses the statement figure when the app reported it', () => {
		const p = orderProfit({
			totalCents: 4500,
			discountCents: 0,
			deliveryFeeCents: 0,
			channelCommissionBps: 1200,
			channelCommissionCents: 500,
			paymentFeesCents: 0,
			deliveryCostCents: 700,
			foodCostCents: 0
		});
		expect(p.commissionCents).toBe(500);
		expect(p.netCents).toBe(3300);
	});
});
