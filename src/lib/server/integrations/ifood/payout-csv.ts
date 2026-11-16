// Reads iFood's financial statement CSV. The exact export format is UNVERIFIED, so columns are
// found by header name: built-in names below, or the shop's own (channel_settings.ifood_payout_columns).
import { parseCsv } from '#lib/domain/menu-csv.ts';
import { slugify } from '#lib/domain/slug.ts';

export type PayoutField = 'order' | 'date' | 'gross' | 'commission' | 'fee' | 'net';

/** Header names tried for each field, compared without accents, case or punctuation. */
export const DEFAULT_PAYOUT_COLUMNS: Record<PayoutField, string[]> = {
	order: [
		'id do pedido',
		'id pedido',
		'numero do pedido',
		'pedido',
		'codigo do pedido',
		'order id'
	],
	date: ['data do pedido', 'data', 'data da venda', 'data do repasse'],
	gross: ['valor bruto', 'valor do pedido', 'total do pedido', 'valor dos itens', 'valor total'],
	commission: ['comissao', 'comissao ifood', 'valor da comissao', 'taxa de comissao'],
	fee: ['taxa de pagamento', 'taxa de transacao', 'taxas', 'taxa', 'outras taxas'],
	net: ['valor liquido', 'repasse', 'valor a receber', 'valor repassado', 'liquido']
};

export interface PayoutRow {
	line: number;
	orderRef: string | null;
	date: string | null;
	grossCents: number;
	commissionCents: number;
	feeCents: number;
	netCents: number;
	raw: Record<string, string>;
}

export interface PayoutParse {
	problem: 'columns' | 'empty' | null;
	missing: PayoutField[];
	rows: PayoutRow[];
}

/** "R$ 1.234,56", "-12,34", "(12,34)", "1234.56" → centavos (absolute value: iFood shows fees negative). */
export function moneyCents(text: string): number {
	const t = text.replace(/[R$\s]/g, '').replace(/[()]/g, '');
	if (!t || t === '-') return 0;
	const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
	const n = Number(normalized);
	return Number.isFinite(n) ? Math.abs(Math.round(n * 100)) : 0;
}

/** dd/mm/aaaa or aaaa-mm-dd → aaaa-mm-dd. */
function isoDate(text: string): string | null {
	const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(text.trim());
	if (br) return `${br[3]}-${br[2]}-${br[1]}`;
	const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text.trim());
	return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

export function parsePayoutCsv(
	input: string,
	columns: Partial<Record<PayoutField, string[]>> = {}
): PayoutParse {
	const text = input.startsWith('﻿') ? input.slice(1) : input;
	const first = text.split(/\r?\n/, 1)[0] ?? '';
	const delimiter =
		(first.match(/;/g)?.length ?? 0) >= (first.match(/,/g)?.length ?? 0) ? ';' : ',';
	const records = parseCsv(text, delimiter).filter((r) => r.some((c) => c.trim()));
	if (records.length < 2) return { problem: 'empty', missing: [], rows: [] };
	const headers = records[0].map((h) => h.trim());
	const keys = headers.map((h) => slugify(h, 60));
	const names = { ...DEFAULT_PAYOUT_COLUMNS, ...columns };
	const at = {} as Record<PayoutField, number>;
	for (const field of Object.keys(DEFAULT_PAYOUT_COLUMNS) as PayoutField[]) {
		at[field] = -1;
		for (const name of names[field] ?? []) {
			const i = keys.indexOf(slugify(name, 60));
			if (i >= 0) {
				at[field] = i;
				break;
			}
		}
	}
	const missing = (['order', 'net'] as PayoutField[]).filter((f) => at[f] < 0);
	if (missing.length) return { problem: 'columns', missing, rows: [] };
	const get = (r: string[], f: PayoutField) => (at[f] >= 0 ? (r[at[f]] ?? '').trim() : '');
	const rows = records.slice(1).map((r, i) => {
		const net = moneyCents(get(r, 'net'));
		const commission = moneyCents(get(r, 'commission'));
		const fee = moneyCents(get(r, 'fee'));
		const gross = at.gross >= 0 ? moneyCents(get(r, 'gross')) : net + commission + fee;
		return {
			line: i + 2,
			orderRef: get(r, 'order') || null,
			date: isoDate(get(r, 'date')),
			grossCents: gross,
			commissionCents: commission,
			feeCents: fee,
			netCents: net,
			raw: Object.fromEntries(headers.map((h, j) => [h, r[j] ?? '']))
		};
	});
	return { problem: null, missing: [], rows };
}
