// How an order reaches the customer, as shown on the staff and kitchen screens.
export type Fulfillment = 'counter' | 'pickup' | 'delivery' | 'dine_in';

const LABELS: Record<Fulfillment, string> = {
	counter: 'Balcão',
	pickup: 'Para viagem',
	delivery: 'Entrega',
	dine_in: 'Comer aqui'
};

/** "Comer aqui · mesa 7", "Para viagem", ... */
export function fulfillmentLabel(type: Fulfillment, tableLabel?: string | null): string {
	if (type === 'dine_in' && tableLabel) return `${LABELS.dine_in} · mesa ${tableLabel}`;
	return LABELS[type];
}
