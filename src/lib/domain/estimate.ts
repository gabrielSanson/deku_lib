// How long an order placed now will take: the base prep time, plus a few minutes for each order
// already in the kitchen, plus the trip for deliveries. Used for promised_at, the menu banner and
// the checkout note.

export interface EstimateInput {
	prepMinutes: number;
	/** Orders confirmed or preparing right now (orders for later not yet due are left out). */
	openKitchenOrders: number;
	perOrderMinutes: number;
	/** The trip; pass 0 for pickup, dine-in and counter orders. */
	deliveryMinutes: number;
}

export function estimateMinutes(i: EstimateInput): number {
	const n = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
	return Math.round(
		n(i.prepMinutes) + n(i.openKitchenOrders) * n(i.perOrderMinutes) + n(i.deliveryMinutes)
	);
}
