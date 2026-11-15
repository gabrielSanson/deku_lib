// NFC-e for paid orders. Off by default: the owner (or their accountant) fills in
// the shop's CNPJ, the provider token and the default fiscal codes, then turns it
// on. A paid order gets a `fiscal-issue` job in the same transaction; the job asks
// the provider for the note and stores the answer. iFood orders are left out.
import { fiscalYear, nfceLines } from '#lib/domain/nfce.ts';
import { audit, type Actor } from '../audit';
import { db, type Db, type Tx } from '../db';
import { DomainError } from '../errors';
import { enqueue, QUEUES } from '../jobs';
import { decryptSecret, encryptSecret } from '../secrets';
import { fill } from '#lib/texts/catalog.ts';
import { getTexts } from '../settings/texts';
import {
	cancelNfce,
	ibsCbsFor,
	issueNfce,
	type FiscalEnvironment,
	type NfceRequest,
	type NfceResult
} from './focusnfe';

export interface FiscalSettings {
	enabled: boolean;
	provider: 'focusnfe';
	environment: FiscalEnvironment;
	cnpj: string | null;
	hasToken: boolean;
	defaultNcm: string | null;
	defaultCfop: string;
	defaultCsosn: string;
	/** Código de regime tributário: 1 Simples, 2 Simples (excesso), 3 normal, 4 MEI. */
	crt: Crt;
	ibsCbsEnabled: boolean;
	ibsCbsCst: string;
	ibsCbsClass: string;
}

export type Crt = '1' | '2' | '3' | '4';

interface SettingsRow {
	enabled: boolean;
	provider: 'focusnfe';
	environment: FiscalEnvironment;
	cnpj: string | null;
	api_token_enc: string | null;
	default_ncm: string | null;
	default_cfop: string;
	default_csosn: string;
	crt: Crt;
	ibs_cbs_enabled: boolean;
	ibs_cbs_cst: string;
	ibs_cbs_class: string;
}

async function settingsRow(sql: Db = db()) {
	const [r] = await sql<SettingsRow[]>`select * from fiscal_settings where id = 1`;
	return r;
}

export async function getFiscalSettings(sql: Db = db()): Promise<FiscalSettings> {
	const r = await settingsRow(sql);
	return {
		enabled: r.enabled,
		provider: r.provider,
		environment: r.environment,
		cnpj: r.cnpj,
		hasToken: !!r.api_token_enc,
		defaultNcm: r.default_ncm,
		defaultCfop: r.default_cfop,
		defaultCsosn: r.default_csosn,
		crt: r.crt,
		ibsCbsEnabled: r.ibs_cbs_enabled,
		ibsCbsCst: r.ibs_cbs_cst,
		ibsCbsClass: r.ibs_cbs_class
	};
}

export async function saveFiscalSettings(
	input: {
		enabled: boolean;
		environment: FiscalEnvironment;
		cnpj: string;
		token?: string | null;
		defaultNcm: string;
		defaultCfop: string;
		defaultCsosn: string;
		/** Left out: kept as they are. */
		crt?: Crt;
		ibsCbsEnabled?: boolean;
		ibsCbsCst?: string;
		ibsCbsClass?: string;
	},
	actor: Actor
) {
	const cnpj = input.cnpj.replace(/\D/g, '');
	const ncm = input.defaultNcm.replace(/\D/g, '');
	if (cnpj && cnpj.length !== 14) throw new DomainError('err.fiscal.cnpj');
	if (ncm && ncm.length !== 8) throw new DomainError('err.fiscal.ncm');
	if (!/^\d{4}$/.test(input.defaultCfop)) throw new DomainError('err.fiscal.cfop');
	if (!/^\d{3}$/.test(input.defaultCsosn)) throw new DomainError('err.fiscal.csosn');
	if (input.crt !== undefined && !['1', '2', '3', '4'].includes(input.crt))
		throw new DomainError('err.fiscal.crt');
	if (input.ibsCbsCst !== undefined && !/^\d{3}$/.test(input.ibsCbsCst))
		throw new DomainError('err.fiscal.ibsCbsCst');
	if (input.ibsCbsClass !== undefined && !/^\d{6}$/.test(input.ibsCbsClass))
		throw new DomainError('err.fiscal.ibsCbsClass');
	return db().begin(async (tx) => {
		const current = await settingsRow(tx);
		const tokenEnc = input.token?.trim()
			? encryptSecret(input.token.trim())
			: current.api_token_enc;
		if (input.enabled && (!cnpj || !tokenEnc || !ncm))
			throw new DomainError('err.fiscal.incomplete', { code: 'incomplete' });
		await tx`
			update fiscal_settings set enabled = ${input.enabled}, environment = ${input.environment},
				cnpj = ${cnpj || null}, api_token_enc = ${tokenEnc}, default_ncm = ${ncm || null},
				default_cfop = ${input.defaultCfop}, default_csosn = ${input.defaultCsosn},
				crt = ${input.crt ?? current.crt},
				ibs_cbs_enabled = ${input.ibsCbsEnabled ?? current.ibs_cbs_enabled},
				ibs_cbs_cst = ${input.ibsCbsCst ?? current.ibs_cbs_cst},
				ibs_cbs_class = ${input.ibsCbsClass ?? current.ibs_cbs_class},
				updated_by = ${actor.id}, updated_at = now()
			where id = 1`;
		await audit(tx, actor, 'fiscal.settings_saved', 'fiscal_settings', null, {
			enabled: input.enabled,
			environment: input.environment,
			token_changed: !!input.token?.trim(),
			crt: input.crt ?? current.crt,
			ibs_cbs_enabled: input.ibsCbsEnabled ?? current.ibs_cbs_enabled
		});
	});
}

export interface IbsCbsRateRow {
	year: number;
	/** Percent strings with 4 decimals, as Postgres numeric returns them. */
	cbsRate: string;
	ibsUfRate: string;
	ibsMunRate: string;
	note: string | null;
	updatedAt: Date;
}

export async function listIbsCbsRates(sql: Db = db()): Promise<IbsCbsRateRow[]> {
	const rows = await sql<
		{
			year: number;
			cbs_rate: string;
			ibs_uf_rate: string;
			ibs_mun_rate: string;
			note: string | null;
			updated_at: Date;
		}[]
	>`select * from ibs_cbs_rates order by year`;
	return rows.map((r) => ({
		year: r.year,
		cbsRate: r.cbs_rate,
		ibsUfRate: r.ibs_uf_rate,
		ibsMunRate: r.ibs_mun_rate,
		note: r.note,
		updatedAt: r.updated_at
	}));
}

const RATE = /^\d{1,3}([.,]\d{1,4})?$/;

/** Saving the table is the owner confirming those rates with the accountant. */
export async function saveIbsCbsRates(
	rows: { year: number; cbsRate: string; ibsUfRate: string; ibsMunRate: string; note: string }[],
	actor: Actor
) {
	for (const r of rows) {
		if (!Number.isInteger(r.year) || r.year < 2026 || r.year > 2040)
			throw new DomainError('err.fiscal.rateYear');
		if (![r.cbsRate, r.ibsUfRate, r.ibsMunRate].every((v) => RATE.test(v.trim())))
			throw new DomainError('err.fiscal.rate', { vars: { year: String(r.year) } });
	}
	const dot = (v: string) => v.trim().replace(',', '.');
	await db().begin(async (tx) => {
		for (const r of rows) {
			await tx`
				insert into ibs_cbs_rates (year, cbs_rate, ibs_uf_rate, ibs_mun_rate, note, updated_at)
				values (${r.year}, ${dot(r.cbsRate)}, ${dot(r.ibsUfRate)}, ${dot(r.ibsMunRate)},
					${r.note.trim() || null}, now())
				on conflict (year) do update set cbs_rate = excluded.cbs_rate,
					ibs_uf_rate = excluded.ibs_uf_rate, ibs_mun_rate = excluded.ibs_mun_rate,
					note = excluded.note, updated_at = now()`;
		}
		await audit(tx, actor, 'fiscal.ibs_cbs_rates_saved', 'fiscal_settings', null, { rows });
	});
}

/** The 2027 row as the migration seeded it; any later save is the owner's confirmation. */
const SEEDED_AT = new Date('2026-11-15T00:00:00Z');

/**
 * From 1 Dec 2026 the coming year's rates must be confirmed (saved) by the owner; until then
 * the fiscal page warns. TODO(verify): the 2027 CBS rate was still "a ser fixada" on 15 Nov 2026.
 */
export function ratesNeedConfirmation(rates: IbsCbsRateRow[], now = new Date()): number | null {
	if (now < new Date('2026-12-01T03:00:00Z')) return null;
	const year = fiscalYear(now) + (now.getUTCMonth() === 11 ? 1 : 0);
	const row = rates.find((r) => r.year === year);
	return !row || row.updatedAt <= SEEDED_AT ? year : null;
}

/** Called when an order becomes fully paid, inside that transaction. */
export async function queueFiscalIssue(tx: Tx | Db, orderId: string) {
	const [s] = await tx<{ enabled: boolean }[]>`select enabled from fiscal_settings where id = 1`;
	if (!s?.enabled) return;
	const [o] = await tx<{ channel: string; is_test: boolean }[]>`
		select channel, is_test from orders where id = ${orderId}`;
	if (!o || o.channel === 'ifood' || o.is_test) return;
	await enqueue(tx, QUEUES.fiscalIssue, { orderId }, { singletonKey: `fiscal:${orderId}` });
}

export interface FiscalDocument {
	id: string;
	status: 'pending' | 'authorized' | 'rejected' | 'error' | 'cancelled';
	environment: string;
	number: string | null;
	series: string | null;
	accessKey: string | null;
	danfeUrl: string | null;
	qrUrl: string | null;
	errorMessage: string | null;
	issuedAt: Date | null;
}

export async function listFiscalDocuments(
	orderId: string,
	sql: Db = db()
): Promise<FiscalDocument[]> {
	const rows = await sql<
		{
			id: string;
			status: FiscalDocument['status'];
			environment: string;
			number: string | null;
			series: string | null;
			access_key: string | null;
			danfe_url: string | null;
			qr_url: string | null;
			error_message: string | null;
			issued_at: Date | null;
		}[]
	>`select id, status, environment, number, series, access_key, danfe_url, qr_url, error_message, issued_at
		from fiscal_documents where order_id = ${orderId} order by created_at desc`;
	return rows.map((r) => ({
		id: r.id,
		status: r.status,
		environment: r.environment,
		number: r.number,
		series: r.series,
		accessKey: r.access_key,
		danfeUrl: r.danfe_url,
		qrUrl: r.qr_url,
		errorMessage: r.error_message,
		issuedAt: r.issued_at
	}));
}

type Issuer = typeof issueNfce;

/**
 * The `fiscal-issue` job. Reuses the live document for the order when there is one
 * (a retry after a network error keeps the same reference, so the provider never
 * issues twice); after a rejection a new document with a new reference is made.
 */
export async function issueFiscalForOrder(
	orderId: string,
	issuer: Issuer = issueNfce,
	opts: { test?: boolean } = {}
) {
	const s = await settingsRow();
	// The homologação test note runs before NFC-e is switched on.
	if ((!s.enabled && !opts.test) || !s.cnpj || !s.api_token_enc || !s.default_ncm)
		return { skipped: true };
	const [order] = await db()<
		{
			order_number: number;
			payment_status: string;
			discount_cents: number;
			delivery_fee_cents: number;
			channel: string;
		}[]
	>`select order_number, payment_status, discount_cents, delivery_fee_cents, channel from orders where id = ${orderId}`;
	if (!order || order.payment_status !== 'paid' || order.channel === 'ifood')
		return { skipped: true };

	let [doc] = await db()<{ id: string; ref: string; status: string; attempts: number }[]>`
		select id, ref, status, attempts from fiscal_documents
		where order_id = ${orderId} and status in ('pending', 'authorized', 'error')`;
	if (doc?.status === 'authorized') return { skipped: true };
	if (!doc) {
		const [{ n }] = await db()<{ n: number }[]>`
			select count(*)::int as n from fiscal_documents where order_id = ${orderId}`;
		[doc] = await db()<{ id: string; ref: string; status: string; attempts: number }[]>`
			insert into fiscal_documents (order_id, ref, environment)
			values (${orderId}, ${`pedido-${order.order_number}-${n + 1}`}, ${s.environment})
			on conflict do nothing
			returning id, ref, status, attempts`;
		if (!doc) return { skipped: true };
	}

	const items = await db()<
		{
			product_sku: string;
			product_name: string;
			quantity: number;
			line_total_cents: number;
			ncm: string | null;
			ibs_cbs_cst: string | null;
			ibs_cbs_class: string | null;
		}[]
	>`select i.product_sku, i.product_name, i.quantity, i.line_total_cents, p.ncm,
			p.ibs_cbs_cst, p.ibs_cbs_class
		from order_items i left join menu_products p on p.sku = i.product_sku
		where i.order_id = ${orderId} order by i.position`;
	const tenders = await db()<{ method: string; amount_cents: number }[]>`
		select method, amount_cents from tenders where order_id = ${orderId} and status = 'paid'`;

	const issuedAt = new Date();
	const request: NfceRequest = {
		ref: doc.ref,
		cnpj: s.cnpj,
		issuedAt,
		lines: nfceLines(
			items.map((i) => ({
				sku: i.product_sku,
				name: i.product_name,
				quantity: i.quantity,
				lineTotalCents: i.line_total_cents,
				ncm: i.ncm,
				ibsCbsCst: i.ibs_cbs_cst,
				ibsCbsClass: i.ibs_cbs_class
			})),
			order.discount_cents,
			order.delivery_fee_cents
		),
		defaults: { ncm: s.default_ncm, cfop: s.default_cfop, csosn: s.default_csosn },
		payments: tenders.map((t) => ({ method: t.method, amountCents: t.amount_cents }))
	};
	if (s.ibs_cbs_enabled) {
		const year = fiscalYear(issuedAt);
		const [rates] = await db()<{ cbs_rate: string; ibs_uf_rate: string; ibs_mun_rate: string }[]>`
			select cbs_rate, ibs_uf_rate, ibs_mun_rate from ibs_cbs_rates where year = ${year}`;
		if (!rates) {
			// Never issue without the year's rates: record why and let the job fail visibly.
			const message = fill((await getTexts())['err.fiscal.noRates'], { year: String(year) });
			await saveResult(doc.id, { status: 'error', message });
			throw new DomainError('err.fiscal.noRates', {
				code: 'no_rates',
				vars: { year: String(year) }
			});
		}
		request.ibsCbs = {
			enabled: true,
			cst: s.ibs_cbs_cst,
			cls: s.ibs_cbs_class,
			rates: { cbs: rates.cbs_rate, ibsUf: rates.ibs_uf_rate, ibsMun: rates.ibs_mun_rate }
		};
		const tax = ibsCbsFor(request)!;
		await db()`update fiscal_documents set ibs_cbs = ${db().json({
			year,
			rates: request.ibsCbs.rates,
			lines: tax.lines.map((l, i) => ({ sku: request.lines[i].sku, ...l })),
			totals: tax.totals
		} as never)} where id = ${doc.id}`;
	}

	let result: NfceResult;
	try {
		result = await issuer(s.environment, decryptSecret(s.api_token_enc), request);
	} catch (err) {
		result = { status: 'error', message: `Sem resposta do provedor: ${String(err)}` };
	}
	await saveResult(doc.id, result);
	// A network or provider error is retried by pg-boss; a rejection waits for staff.
	if (result.status === 'error') throw new Error(`fiscal issue failed: ${result.message}`);
	return { status: result.status };
}

async function saveResult(id: string, r: NfceResult) {
	await db()`
		update fiscal_documents set status = ${r.status}, number = coalesce(${r.number ?? null}, number),
			series = coalesce(${r.series ?? null}, series), access_key = coalesce(${r.accessKey ?? null}, access_key),
			danfe_url = coalesce(${r.danfeUrl ?? null}, danfe_url), xml_url = coalesce(${r.xmlUrl ?? null}, xml_url),
			qr_url = coalesce(${r.qrUrl ?? null}, qr_url), error_message = ${r.message ?? null},
			attempts = attempts + 1, updated_at = now(),
			issued_at = case when ${r.status} = 'authorized' then coalesce(issued_at, now()) else issued_at end,
			cancelled_at = case when ${r.status} = 'cancelled' then now() else cancelled_at end
		where id = ${id}`;
}

/** Staff ask for the note again after fixing what the provider rejected. */
export async function retryFiscal(orderId: string, actor: Actor) {
	await db().begin(async (tx) => {
		await queueFiscalIssue(tx, orderId);
		await audit(tx, actor, 'fiscal.retry', 'order', orderId, {});
	});
}

export async function cancelFiscal(orderId: string, reason: string, actor: Actor) {
	if (reason.trim().length < 15) throw new DomainError('err.fiscal.justification');
	const s = await settingsRow();
	if (!s.api_token_enc) throw new DomainError('err.fiscal.off');
	const [doc] = await db()<{ id: string; ref: string }[]>`
		select id, ref from fiscal_documents where order_id = ${orderId} and status = 'authorized'`;
	if (!doc) throw new DomainError('err.fiscal.noDocument');
	const r = await cancelNfce(s.environment, decryptSecret(s.api_token_enc), doc.ref, reason.trim());
	if (r.status !== 'cancelled')
		throw new DomainError(r.message ? { text: r.message } : 'err.fiscal.cancelRefused', {
			code: 'fiscal_cancel'
		});
	await saveResult(doc.id, r);
	await audit(db(), actor, 'fiscal.cancelled', 'order', orderId, { reason });
}

export type ReadinessState = 'ok' | 'missing' | 'warn';
export interface ReadinessItem {
	key: 'cnpj' | 'token' | 'environment' | 'ncm' | 'crt' | 'ibsCbs' | 'homologation';
	state: ReadinessState;
}

/** What a shop still has to do before turning NFC-e on, in the order the screen lists it. */
export async function fiscalReadiness(sql: Db = db(), now = new Date()): Promise<ReadinessItem[]> {
	const r = await settingsRow(sql);
	const [h] = await sql<{ ok: boolean }[]>`
		select exists (select 1 from fiscal_documents
			where environment = 'homologacao' and status = 'authorized') as ok`;
	// Simples Nacional (and MEI) may leave IBS/CBS out in 2026; from 2027 it is required.
	const simples = r.crt === '1' || r.crt === '4';
	const ibsCbs: ReadinessState = r.ibs_cbs_enabled
		? 'ok'
		: simples && fiscalYear(now) < 2027
			? 'warn'
			: 'missing';
	return [
		{ key: 'cnpj', state: r.cnpj ? 'ok' : 'missing' },
		{ key: 'token', state: r.api_token_enc ? 'ok' : 'missing' },
		{ key: 'environment', state: r.environment === 'producao' ? 'ok' : 'warn' },
		{ key: 'ncm', state: r.default_ncm ? 'ok' : 'missing' },
		{ key: 'crt', state: 'ok' },
		{ key: 'ibsCbs', state: ibsCbs },
		{ key: 'homologation', state: h.ok ? 'ok' : 'missing' }
	];
}

/**
 * "Emitir nota de teste": a R$ 1,00 note in homologação for a synthetic order that is marked
 * as a test, so it never shows in reports or the drawer.
 */
export async function issueTestNote(actor: Actor, issuer: Issuer = issueNfce) {
	const s = await settingsRow();
	if (s.environment !== 'homologacao')
		throw new DomainError('err.fiscal.testHomologOnly', { code: 'not_homolog' });
	if (!s.cnpj || !s.api_token_enc || !s.default_ncm)
		throw new DomainError('err.fiscal.incomplete', { code: 'incomplete' });
	const orderId = await db().begin(async (tx) => {
		const [o] = await tx<{ id: string }[]>`
			insert into orders (channel, source_mode, customer_label, status, payment_status, fulfillment_type,
				subtotal_cents, total_cents, catalog_version, idempotency_key, is_test, payment_plan,
				completed_at, created_by)
			values ('counter', 'staff_pos', 'Nota de teste', 'completed', 'paid', 'counter', 100, 100, 0,
				${`fiscal-test-${crypto.randomUUID()}`}, true, 'counter', now(),
				${actor.type === 'staff' ? actor.id : null})
			returning id`;
		await tx`
			insert into order_items (order_id, position, product_sku, product_name, quantity,
				unit_price_cents, line_total_cents)
			values (${o.id}, 0, 'TESTE-NFCE', 'Item de teste', 1, 100, 100)`;
		await tx`
			insert into tenders (order_id, method, provider_reference, amount_cents, status, idempotency_key,
				confirmed_at)
			values (${o.id}, 'external_pix', 'TESTE', 100, 'paid', ${`fiscal-test-${o.id}`}, now())`;
		await audit(tx, actor, 'fiscal.test_note', 'order', o.id, {});
		return o.id;
	});
	await issueFiscalForOrder(orderId, issuer, { test: true }).catch(() => {});
	const [doc] = await listFiscalDocuments(orderId);
	return doc ?? null;
}

export interface FailedNote {
	orderId: string;
	orderNumber: number;
	status: 'rejected' | 'error';
	message: string | null;
	at: Date;
}

/** "Notas com erro": rejected or failed notes of the last 30 days that are still not fixed. */
export async function failedNotes(sql: Db = db()): Promise<FailedNote[]> {
	const rows = await sql<
		{
			order_id: string;
			order_number: number;
			status: 'rejected' | 'error';
			error_message: string | null;
			updated_at: Date;
		}[]
	>`
		select d.order_id, o.order_number, d.status, d.error_message, d.updated_at
		from fiscal_documents d join orders o on o.id = d.order_id
		where d.status in ('rejected', 'error') and d.updated_at > now() - interval '30 days'
			and not exists (select 1 from fiscal_documents a
				where a.order_id = d.order_id and a.status in ('authorized', 'pending'))
		order by d.updated_at desc
		limit 50`;
	return rows.map((r) => ({
		orderId: r.order_id,
		orderNumber: r.order_number,
		status: r.status,
		message: r.error_message,
		at: r.updated_at
	}));
}
