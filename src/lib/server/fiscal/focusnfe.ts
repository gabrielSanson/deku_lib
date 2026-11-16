// Focus NFe (focusnfe.com.br) NFC-e API. Written from the provider's public docs
// and not yet run against it: start in the homologation environment.
import {
	cents,
	formatRate,
	ibsCbsLine,
	ibsCbsTotals,
	nfcePaymentCode,
	rateUnits,
	type IbsCbsLine,
	type IbsCbsRates,
	type IbsCbsTotals,
	type NfceLine
} from '#lib/domain/nfce.ts';

export interface NfceRequest {
	ref: string;
	cnpj: string;
	issuedAt: Date;
	lines: NfceLine[];
	defaults: { ncm: string; cfop: string; csosn: string };
	payments: { method: string; amountCents: number }[];
	customerCpf?: string | null;
	/** Tax reform fields; absent or disabled sends exactly the pre-reform body. */
	ibsCbs?: { enabled: boolean; cst: string; cls: string; rates: IbsCbsRates };
}

/**
 * Focus NFe field names for IBS/CBS. The item names come from Focus's field reference
 * (campos.focusnfe.com.br, read 15 Nov 2026); the totals names only from an example in its
 * reforma tributária guide.
 * TODO(verify): confirm the totals names in homologação before turning IBS/CBS on.
 */
export const FOCUS_IBS_CBS_FIELDS = {
	item: {
		cst: 'ibs_cbs_situacao_tributaria',
		cls: 'ibs_cbs_classificacao_tributaria',
		base: 'ibs_cbs_base_calculo',
		ibsUfRate: 'ibs_uf_aliquota',
		ibsUfValue: 'ibs_uf_valor',
		ibsMunRate: 'ibs_mun_aliquota',
		ibsMunValue: 'ibs_mun_valor',
		ibsValue: 'ibs_valor_total',
		cbsRate: 'cbs_aliquota',
		cbsValue: 'cbs_valor'
	},
	totals: {
		base: 'ibs_cbs_base_calculo',
		ibsUfValue: 'ibs_uf_valor_total',
		ibsValue: 'ibs_valor_total',
		cbsValue: 'cbs_valor_total'
	}
} as const;

/** The IBS/CBS values of every line and their totals, or null when switched off. */
export function ibsCbsFor(
	r: Pick<NfceRequest, 'lines' | 'ibsCbs'>
): { lines: IbsCbsLine[]; totals: IbsCbsTotals } | null {
	if (!r.ibsCbs?.enabled) return null;
	const { cst, cls, rates } = r.ibsCbs;
	const lines = r.lines.map((l) => ibsCbsLine(l, rates, cst, cls));
	return { lines, totals: ibsCbsTotals(lines) };
}

export interface NfceResult {
	status: 'authorized' | 'contingency' | 'rejected' | 'pending' | 'error' | 'cancelled';
	number?: string | null;
	series?: string | null;
	accessKey?: string | null;
	danfeUrl?: string | null;
	xmlUrl?: string | null;
	qrUrl?: string | null;
	message?: string | null;
}

const BASE = {
	homologacao: 'https://homologacao.focusnfe.com.br',
	producao: 'https://api.focusnfe.com.br'
} as const;
export type FiscalEnvironment = keyof typeof BASE;

export function nfceBody(r: NfceRequest) {
	const tax = ibsCbsFor(r);
	const rate = (v: string) => formatRate(rateUnits(v));
	const F = FOCUS_IBS_CBS_FIELDS;
	return {
		cnpj_emitente: r.cnpj,
		data_emissao: r.issuedAt.toISOString(),
		natureza_operacao: 'VENDA AO CONSUMIDOR',
		presenca_comprador: '1',
		modalidade_frete: '9',
		local_destino: '1',
		...(r.customerCpf ? { cpf_destinatario: r.customerCpf } : {}),
		items: r.lines.map((l, i) => {
			const unit = cents(Math.round(l.grossCents / l.quantity));
			return {
				numero_item: String(i + 1),
				codigo_produto: l.sku,
				descricao: l.name.slice(0, 120),
				codigo_ncm: l.ncm ?? r.defaults.ncm,
				cfop: r.defaults.cfop,
				unidade_comercial: 'UN',
				unidade_tributavel: 'UN',
				quantidade_comercial: l.quantity.toFixed(4),
				quantidade_tributavel: l.quantity.toFixed(4),
				valor_unitario_comercial: unit,
				valor_unitario_tributavel: unit,
				valor_bruto: cents(l.grossCents),
				...(l.discountCents ? { valor_desconto: cents(l.discountCents) } : {}),
				...(l.otherCents ? { valor_outras_despesas: cents(l.otherCents) } : {}),
				icms_origem: '0',
				icms_situacao_tributaria: r.defaults.csosn,
				...(tax && r.ibsCbs
					? {
							[F.item.cst]: tax.lines[i].cst,
							[F.item.cls]: tax.lines[i].cls,
							[F.item.base]: cents(tax.lines[i].baseCents),
							[F.item.ibsUfRate]: rate(r.ibsCbs.rates.ibsUf),
							[F.item.ibsUfValue]: cents(tax.lines[i].ibsUfCents),
							[F.item.ibsMunRate]: rate(r.ibsCbs.rates.ibsMun),
							[F.item.ibsMunValue]: cents(tax.lines[i].ibsMunCents),
							[F.item.ibsValue]: cents(tax.lines[i].ibsCents),
							[F.item.cbsRate]: rate(r.ibsCbs.rates.cbs),
							[F.item.cbsValue]: cents(tax.lines[i].cbsCents)
						}
					: {})
			};
		}),
		...(tax
			? {
					[F.totals.base]: cents(tax.totals.baseCents),
					[F.totals.ibsUfValue]: cents(tax.totals.ibsUfCents),
					[F.totals.ibsValue]: cents(tax.totals.ibsCents),
					[F.totals.cbsValue]: cents(tax.totals.cbsCents)
				}
			: {}),
		formas_pagamento: r.payments.map((p) => ({
			forma_pagamento: nfcePaymentCode(p.method),
			valor_pagamento: cents(p.amountCents),
			...(nfcePaymentCode(p.method) === '99' ? { descricao_pagamento: 'Cartão' } : {})
		}))
	};
}

function auth(token: string) {
	return 'Basic ' + Buffer.from(`${token}:`).toString('base64');
}

function toResult(env: FiscalEnvironment, json: Record<string, unknown>): NfceResult {
	const s = String(json.status ?? '');
	const link = (v: unknown) =>
		typeof v === 'string' && v ? (v.startsWith('http') ? v : `${BASE[env]}${v}`) : null;
	const status: NfceResult['status'] =
		s === 'autorizado'
			? 'authorized'
			: s === 'cancelado'
				? 'cancelled'
				: s === 'processando_autorizacao'
					? 'pending'
					: s.startsWith('erro') || s === 'denegado'
						? 'rejected'
						: 'error';
	// Offline contingency (tpEmis 9): Focus signs the note and transmits it once SEFAZ is back.
	// [UNVERIFIED] TODO(verify): field names `contingencia_offline` / `contingencia_offline_efetivada`
	// against Focus NFe's NFC-e docs in homologação.
	const contingency =
		status === 'authorized' &&
		json.contingencia_offline === true &&
		json.contingencia_offline_efetivada !== true;
	return {
		status: contingency ? 'contingency' : status,
		number: json.numero != null ? String(json.numero) : null,
		series: json.serie != null ? String(json.serie) : null,
		accessKey: typeof json.chave_nfe === 'string' ? json.chave_nfe.replace(/^NFe/, '') : null,
		danfeUrl: link(json.caminho_danfe),
		xmlUrl: link(json.caminho_xml_nota_fiscal),
		qrUrl: typeof json.qrcode_url === 'string' ? json.qrcode_url : null,
		message:
			(typeof json.mensagem_sefaz === 'string' && json.mensagem_sefaz) ||
			(typeof json.mensagem === 'string' && json.mensagem) ||
			null
	};
}

export async function issueNfce(
	env: FiscalEnvironment,
	token: string,
	r: NfceRequest,
	fetchFn: typeof fetch = fetch
): Promise<NfceResult> {
	const res = await fetchFn(`${BASE[env]}/v2/nfce?ref=${encodeURIComponent(r.ref)}`, {
		method: 'POST',
		headers: { authorization: auth(token), 'content-type': 'application/json' },
		body: JSON.stringify(nfceBody(r))
	});
	const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (res.status === 401 || res.status === 403)
		return {
			status: 'error',
			message: 'Token da Focus NFe recusado. Confira o token e o ambiente.'
		};
	if (res.status >= 500)
		return { status: 'error', message: `Focus NFe indisponível (${res.status}).` };
	if (res.status === 422 || res.status === 400) {
		const r2 = toResult(env, json);
		return { ...r2, status: r2.status === 'error' ? 'rejected' : r2.status };
	}
	return toResult(env, json);
}

/** The note's current state at the provider (used to follow contingency notes). */
export async function consultNfce(
	env: FiscalEnvironment,
	token: string,
	ref: string,
	fetchFn: typeof fetch = fetch
): Promise<NfceResult> {
	const res = await fetchFn(`${BASE[env]}/v2/nfce/${encodeURIComponent(ref)}`, {
		headers: { authorization: auth(token) }
	});
	if (res.status >= 500 || res.status === 401 || res.status === 403)
		return { status: 'error', message: `Focus NFe indisponível (${res.status}).` };
	return toResult(env, (await res.json().catch(() => ({}))) as Record<string, unknown>);
}

/** Downloads a note's XML (cached by the export). */
export async function downloadXml(
	token: string,
	url: string,
	fetchFn: typeof fetch = fetch
): Promise<string | null> {
	try {
		const res = await fetchFn(url, {
			headers: { authorization: auth(token) },
			signal: AbortSignal.timeout(15_000)
		});
		return res.ok ? await res.text() : null;
	} catch {
		return null;
	}
}

export async function cancelNfce(
	env: FiscalEnvironment,
	token: string,
	ref: string,
	reason: string,
	fetchFn: typeof fetch = fetch
): Promise<NfceResult> {
	const res = await fetchFn(`${BASE[env]}/v2/nfce/${encodeURIComponent(ref)}`, {
		method: 'DELETE',
		headers: { authorization: auth(token), 'content-type': 'application/json' },
		body: JSON.stringify({ justificativa: reason })
	});
	const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	return toResult(env, json);
}
