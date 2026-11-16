// Resultado do mês (DRE simplificado). Pure: the page, the CSV and the tests share it.
import { roundHalfEven } from './recipe';

export const PL_LINES = [
	'cmv',
	'pessoal',
	'ocupacao',
	'marketing',
	'taxas',
	'impostos',
	'outros'
] as const;
export type PlLine = (typeof PL_LINES)[number];

export interface DreInput {
	grossCents: number;
	discountCents: number;
	/** Simples Nacional on sales after discounts. */
	simplesRateBps: number;
	foodCostCents: number;
	commissionsCents: number;
	paymentFeesCents: number;
	deliveryCostCents: number;
	expenses: Partial<Record<PlLine, number>>;
}

export interface DreLine {
	key: string;
	cents: number;
	/** Subtotals are shown in bold. */
	total?: boolean;
}

/** Minus, without a negative zero. */
const neg = (n: number) => 0 - n;

export function buildDre(i: DreInput): { lines: DreLine[]; resultCents: number } {
	const sales = i.grossCents - i.discountCents;
	const taxes = roundHalfEven((sales * i.simplesRateBps) / 10_000);
	const netRevenue = sales - taxes;
	const gross = netRevenue - i.foodCostCents;
	const afterChannels = gross - i.commissionsCents - i.paymentFeesCents - i.deliveryCostCents;
	const expenses = PL_LINES.map((l) => ({ key: `exp.${l}`, cents: neg(i.expenses[l] ?? 0) }));
	const resultCents = expenses.reduce((n, e) => n + e.cents, afterChannels);
	return {
		lines: [
			{ key: 'gross', cents: i.grossCents },
			{ key: 'discounts', cents: neg(i.discountCents) },
			{ key: 'taxes', cents: neg(taxes) },
			{ key: 'netRevenue', cents: netRevenue, total: true },
			{ key: 'food', cents: neg(i.foodCostCents) },
			{ key: 'grossProfit', cents: gross, total: true },
			{ key: 'commissions', cents: neg(i.commissionsCents) },
			{ key: 'fees', cents: neg(i.paymentFeesCents) },
			{ key: 'delivery', cents: neg(i.deliveryCostCents) },
			...expenses,
			{ key: 'result', cents: resultCents, total: true }
		],
		resultCents
	};
}

/** Recurring expenses due this month that are not entered yet. */
export function monthStart(date: string): string {
	return `${date.slice(0, 7)}-01`;
}
