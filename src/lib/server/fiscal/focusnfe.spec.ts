import { describe, expect, it } from 'vitest';
import { nfceLines } from '#lib/domain/nfce.ts';
import { consultNfce, nfceBody, type NfceRequest } from './focusnfe';

// The acceptance example: R$ 45,00 of food, R$ 5,00 delivery, R$ 4,50 discount: R$ 45,50 to pay.
const base: NfceRequest = {
	ref: 'pedido-1001-1',
	cnpj: '12345678000190',
	issuedAt: new Date('2026-11-20T15:00:00Z'),
	lines: nfceLines(
		[
			{ sku: 'BRG-CLASSICO', name: 'Clássico', quantity: 1, lineTotalCents: 3000, ncm: null },
			{ sku: 'ACP-FRITAS', name: 'Fritas', quantity: 2, lineTotalCents: 1500, ncm: '20052000' }
		],
		450,
		500
	),
	defaults: { ncm: '21069090', cfop: '5102', csosn: '102' },
	payments: [{ method: 'external_pix', amountCents: 4550 }]
};

const money = (v: unknown) => Math.round(Number(v) * 100);

describe('Focus NFe body', () => {
	it('is unchanged when IBS/CBS is off', () => {
		const off = nfceBody(base);
		expect(
			nfceBody({
				...base,
				ibsCbs: {
					enabled: false,
					cst: '000',
					cls: '000001',
					rates: { cbs: '0.9', ibsUf: '0.1', ibsMun: '0' }
				}
			})
		).toEqual(off);
		expect(JSON.stringify(off)).not.toMatch(/ibs|cbs/);
		expect(off).toMatchSnapshot();
	});

	it('sends IBS/CBS on every line with totals that add up', () => {
		const body = nfceBody({
			...base,
			ibsCbs: {
				enabled: true,
				cst: '000',
				cls: '000001',
				rates: { cbs: '0.9000', ibsUf: '0.1000', ibsMun: '0.0000' }
			}
		}) as Record<string, unknown> & { items: Record<string, unknown>[] };
		const sum = (k: string) => body.items.reduce((n, i) => n + money(i[k]), 0);
		expect(sum('cbs_valor')).toBe(money(body.cbs_valor_total));
		expect(sum('ibs_valor_total')).toBe(money(body.ibs_valor_total));
		expect(sum('ibs_uf_valor')).toBe(money(body.ibs_uf_valor_total));
		expect(sum('ibs_cbs_base_calculo')).toBe(money(body.ibs_cbs_base_calculo));
		// The note still adds up to the order total.
		const total = body.items.reduce(
			(n, i) =>
				n +
				money(i.valor_bruto) -
				money(i.valor_desconto ?? 0) +
				money(i.valor_outras_despesas ?? 0),
			0
		);
		expect(total).toBe(4550);
		expect(body.items[0].cbs_aliquota).toBe('0.9000');
		expect(body).toMatchSnapshot();
	});
});

describe('consultNfce', () => {
	const answer = (body: Record<string, unknown>, status = 200) =>
		(async () => ({ status, json: async () => body })) as unknown as typeof fetch;

	it('treats an offline-contingency note as contingency until it is transmitted', async () => {
		const pending = await consultNfce(
			'producao',
			't',
			'pedido-1-1',
			answer({ status: 'autorizado', contingencia_offline: true, numero: 7 })
		);
		expect(pending).toMatchObject({ status: 'contingency', number: '7' });
		const done = await consultNfce(
			'producao',
			't',
			'pedido-1-1',
			answer({
				status: 'autorizado',
				contingencia_offline: true,
				contingencia_offline_efetivada: true
			})
		);
		expect(done.status).toBe('authorized');
		expect((await consultNfce('producao', 't', 'x', answer({ status: 'autorizado' }))).status).toBe(
			'authorized'
		);
	});

	it('reports the provider being down as an error', async () => {
		expect((await consultNfce('producao', 't', 'x', answer({}, 503))).status).toBe('error');
	});
});
