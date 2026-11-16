import { describe, expect, it } from 'vitest';
import { moneyCents, parsePayoutCsv } from './payout-csv';

describe('iFood statement', () => {
	it('finds columns by name and reads Brazilian money and dates', () => {
		const csv =
			'﻿Data do pedido;ID do pedido;Valor bruto;Comissão;Taxa de pagamento;Valor líquido\n' +
			'03/11/2026;abc-1;"R$ 1.084,68";-130,16;-34,71;919,81\n' +
			'04/11/2026;7F3A;50,00;(6,00);1,60;42,40\n';
		const r = parsePayoutCsv(csv);
		expect(r.problem).toBeNull();
		expect(r.rows).toHaveLength(2);
		expect(r.rows[0]).toMatchObject({
			orderRef: 'abc-1',
			date: '2026-11-03',
			grossCents: 108468,
			commissionCents: 13016,
			feeCents: 3471,
			netCents: 91981
		});
		expect(r.rows[1].commissionCents).toBe(600);
	});

	it('uses the shop column names and works out gross when missing', () => {
		const csv = 'Pedido iFood,Repasse final,Comissao\nX1,90.00,10.00\n';
		const r = parsePayoutCsv(csv, { order: ['Pedido iFood'], net: ['Repasse final'] });
		expect(r.rows[0]).toMatchObject({ orderRef: 'X1', netCents: 9000, grossCents: 10000 });
	});

	it('says which columns it could not find', () => {
		expect(parsePayoutCsv('a;b\n1;2\n')).toMatchObject({
			problem: 'columns',
			missing: ['order', 'net']
		});
		expect(parsePayoutCsv('so o cabecalho\n').problem).toBe('empty');
		expect(moneyCents('-')).toBe(0);
	});
});
