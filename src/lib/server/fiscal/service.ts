// NFC-e for paid orders. Off by default: the owner (or their accountant) fills in
// the shop's CNPJ, the provider token and the default fiscal codes, then turns it
// on. A paid order gets a `fiscal-issue` job in the same transaction; the job asks
// the provider for the note and stores the answer. iFood orders are left out.
import { nfceLines } from '#lib/domain/nfce.ts';
import { audit, type Actor } from '../audit';
import { db, type Db, type Tx } from '../db';
import { DomainError } from '../errors';
import { enqueue, QUEUES } from '../jobs';
import { decryptSecret, encryptSecret } from '../secrets';
import { cancelNfce, issueNfce, type FiscalEnvironment, type NfceResult } from './focusnfe';

export interface FiscalSettings {
	enabled: boolean;
	provider: 'focusnfe';
	environment: FiscalEnvironment;
	cnpj: string | null;
	hasToken: boolean;
	defaultNcm: string | null;
	defaultCfop: string;
	defaultCsosn: string;
}

interface SettingsRow {
	enabled: boolean;
	provider: 'focusnfe';
	environment: FiscalEnvironment;
	cnpj: string | null;
	api_token_enc: string | null;
	default_ncm: string | null;
	default_cfop: string;
	default_csosn: string;
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
		defaultCsosn: r.default_csosn
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
	},
	actor: Actor
) {
	const cnpj = input.cnpj.replace(/\D/g, '');
	const ncm = input.defaultNcm.replace(/\D/g, '');
	if (cnpj && cnpj.length !== 14) throw new DomainError('O CNPJ tem 14 números.');
	if (ncm && ncm.length !== 8) throw new DomainError('O NCM tem 8 números.');
	if (!/^\d{4}$/.test(input.defaultCfop)) throw new DomainError('O CFOP tem 4 números.');
	if (!/^\d{3}$/.test(input.defaultCsosn)) throw new DomainError('O CSOSN/CST tem 3 números.');
	return db().begin(async (tx) => {
		const current = await settingsRow(tx);
		const tokenEnc = input.token?.trim()
			? encryptSecret(input.token.trim())
			: current.api_token_enc;
		if (input.enabled && (!cnpj || !tokenEnc || !ncm))
			throw new DomainError(
				'Para ligar a nota fiscal, preencha CNPJ, token do provedor e NCM padrão.',
				'incomplete'
			);
		await tx`
			update fiscal_settings set enabled = ${input.enabled}, environment = ${input.environment},
				cnpj = ${cnpj || null}, api_token_enc = ${tokenEnc}, default_ncm = ${ncm || null},
				default_cfop = ${input.defaultCfop}, default_csosn = ${input.defaultCsosn},
				updated_by = ${actor.id}, updated_at = now()
			where id = 1`;
		await audit(tx, actor, 'fiscal.settings_saved', 'fiscal_settings', null, {
			enabled: input.enabled,
			environment: input.environment,
			token_changed: !!input.token?.trim()
		});
	});
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
export async function issueFiscalForOrder(orderId: string, issuer: Issuer = issueNfce) {
	const s = await settingsRow();
	if (!s.enabled || !s.cnpj || !s.api_token_enc || !s.default_ncm) return { skipped: true };
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
		}[]
	>`select i.product_sku, i.product_name, i.quantity, i.line_total_cents, p.ncm
		from order_items i left join menu_products p on p.sku = i.product_sku
		where i.order_id = ${orderId} order by i.position`;
	const tenders = await db()<{ method: string; amount_cents: number }[]>`
		select method, amount_cents from tenders where order_id = ${orderId} and status = 'paid'`;

	let result: NfceResult;
	try {
		result = await issuer(s.environment, decryptSecret(s.api_token_enc), {
			ref: doc.ref,
			cnpj: s.cnpj,
			issuedAt: new Date(),
			lines: nfceLines(
				items.map((i) => ({
					sku: i.product_sku,
					name: i.product_name,
					quantity: i.quantity,
					lineTotalCents: i.line_total_cents,
					ncm: i.ncm
				})),
				order.discount_cents,
				order.delivery_fee_cents
			),
			defaults: { ncm: s.default_ncm, cfop: s.default_cfop, csosn: s.default_csosn },
			payments: tenders.map((t) => ({ method: t.method, amountCents: t.amount_cents }))
		});
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
	if (reason.trim().length < 15)
		throw new DomainError('A justificativa do cancelamento precisa ter pelo menos 15 letras.');
	const s = await settingsRow();
	if (!s.api_token_enc) throw new DomainError('Nota fiscal não configurada.');
	const [doc] = await db()<{ id: string; ref: string }[]>`
		select id, ref from fiscal_documents where order_id = ${orderId} and status = 'authorized'`;
	if (!doc) throw new DomainError('Este pedido não tem nota autorizada.');
	const r = await cancelNfce(s.environment, decryptSecret(s.api_token_enc), doc.ref, reason.trim());
	if (r.status !== 'cancelled')
		throw new DomainError(r.message ?? 'A SEFAZ não aceitou o cancelamento.', 'fiscal_cancel');
	await saveResult(doc.id, r);
	await audit(db(), actor, 'fiscal.cancelled', 'order', orderId, { reason });
}
