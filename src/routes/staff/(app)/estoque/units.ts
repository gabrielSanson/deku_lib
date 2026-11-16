// How stock quantities and costs read on screen.
import { formatBRL } from '#lib/domain/money.ts';

/** "R$ 40,00 por 1000 g": the cost of a readable amount of the base unit. */
export function costLabel(avgCostMicro: number, unit: string) {
	const per = unit === 'un' ? 1 : 1000;
	return { value: formatBRL(Math.round((avgCostMicro * per) / 1_000_000)), qty: per };
}

export const qty = (n: number) => n.toLocaleString('pt-BR');
