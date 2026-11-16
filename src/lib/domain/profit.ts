// What an order leaves the shop after the app's commission, payment fees, delivery and food.
// Pure, so the report, the order page and the tests all count the same way.
import { roundHalfEven } from './recipe';

export interface ProfitInput {
	/** What the customer paid (after discounts, with the delivery fee). */
	totalCents: number;
	discountCents: number;
	deliveryFeeCents: number;
	/** Delivery-app commission on the total; 0 on the shop's own channels. */
	channelCommissionBps: number;
	/** When the app's statement says what it kept, that figure replaces the rate. */
	channelCommissionCents?: number | null;
	paymentFeesCents: number;
	deliveryCostCents: number;
	/** Null when a line has no ficha técnica: net is then shown before food cost only. */
	foodCostCents: number | null;
}

export interface Profit {
	commissionCents: number;
	beforeFoodCents: number;
	netCents: number | null;
}

export function orderProfit(i: ProfitInput): Profit {
	const commissionCents =
		i.channelCommissionCents ?? roundHalfEven((i.totalCents * i.channelCommissionBps) / 10_000);
	const beforeFoodCents = i.totalCents - commissionCents - i.paymentFeesCents - i.deliveryCostCents;
	return {
		commissionCents,
		beforeFoodCents,
		netCents: i.foodCostCents == null ? null : beforeFoodCents - i.foodCostCents
	};
}
