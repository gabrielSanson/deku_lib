// Nota fiscal → Exportar mês (S5.5): every authorized or cancelled NFC-e of a month as XML, plus
// a CSV of totals, in one zip. XMLs are downloaded once from the provider and kept in the
// database. On the 1st, the accountant gets an e-mail with a signed link to last month's zip.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { SHOP_TZ } from '../analytics/queries';
import { config } from '../config';
import { currentShopId, db, type Db } from '../db';
import { queueMessage } from '../messaging/outbox';
import { shopOrigin } from '../platform/shops';
import { decryptSecret } from '../secrets';
import { getStoreProfile } from '../settings/profile';
import { downloadXml } from './focusnfe';
import { accountantEmail, getFiscalSettings } from './service';
import { buildZip } from './zip';

export interface ExportDoc {
	id: string;
	orderNumber: number;
	status: 'authorized' | 'cancelled';
	number: string | null;
	series: string | null;
	accessKey: string | null;
	ref: string;
	issuedAt: Date | null;
	totalCents: number;
	xmlUrl: string | null;
	xml: string | null;
}

export async function monthDocuments(month: string, sql: Db = db()) {
	return sql<ExportDoc[]>`
		select d.id, o.order_number as "orderNumber", d.status, d.number, d.series,
			d.access_key as "accessKey", d.ref, d.issued_at as "issuedAt", o.total_cents as "totalCents",
			d.xml_url as "xmlUrl", d.xml_cached as xml
		from fiscal_documents d join orders o on o.id = d.order_id
		where d.status in ('authorized', 'cancelled') and d.environment = 'producao'
			and d.issued_at >= (${`${month}-01`}::timestamp at time zone ${SHOP_TZ})
			and d.issued_at < ((${`${month}-01`}::timestamp + interval '1 month') at time zone ${SHOP_TZ})
		order by d.issued_at`;
}

const cents = (n: number) => (n / 100).toFixed(2).replace('.', ',');

export function exportCsv(docs: ExportDoc[]) {
	const rows = [
		['numero', 'serie', 'chave', 'situacao', 'emitida_em', 'pedido', 'total', 'xml'].join(';'),
		...docs.map((d) =>
			[
				d.number ?? '',
				d.series ?? '',
				d.accessKey ?? '',
				d.status === 'cancelled' ? 'cancelada' : 'autorizada',
				d.issuedAt ? new Date(d.issuedAt).toISOString() : '',
				d.orderNumber,
				cents(d.totalCents),
				d.xml ? 'ok' : 'faltando'
			].join(';')
		)
	];
	const authorized = docs.filter((d) => d.status === 'authorized');
	rows.push(
		'',
		`total_autorizado;;;;;${authorized.length};${cents(authorized.reduce((n, d) => n + d.totalCents, 0))};`
	);
	return '﻿' + rows.join('\r\n') + '\r\n';
}

/** Builds the month's zip, downloading XMLs not cached yet. */
export async function exportMonth(month: string, fetchFn: typeof fetch = fetch) {
	const sql = db();
	const docs = await monthDocuments(month, sql);
	const [s] = await sql<{ api_token_enc: string | null }[]>`
		select api_token_enc from fiscal_settings where shop_id = current_shop_id()`;
	const token = s?.api_token_enc ? decryptSecret(s.api_token_enc) : null;
	for (const d of docs) {
		if (d.xml || !d.xmlUrl || !token) continue;
		d.xml = await downloadXml(token, d.xmlUrl, fetchFn);
		if (d.xml) await sql`update fiscal_documents set xml_cached = ${d.xml} where id = ${d.id}`;
	}
	const files = docs
		.filter((d) => d.xml)
		.map((d) => ({ name: `nfce-${month}/${d.accessKey || d.ref}.xml`, data: d.xml! }));
	files.push({ name: `resumo-${month}.csv`, data: exportCsv(docs) });
	return { zip: buildZip(files), count: docs.length, missing: docs.filter((d) => !d.xml).length };
}

// Signed links for the accountant: shop, month and expiry, HMAC'd with APP_SECRET.
function sign(payload: string) {
	const secret = config().APP_SECRET ?? 'local-development-only';
	return createHmac('sha256', `fiscal-export:${secret}`).update(payload).digest('base64url');
}

export function exportToken(shopId: string, month: string, days = 45, now = Date.now()) {
	const exp = Math.floor(now / 1000) + days * 86_400;
	const payload = `${shopId}.${month}.${exp}`;
	return `${payload}.${sign(payload)}`;
}

/** The month a link is for, when it is valid for this shop. */
export function verifyExportToken(token: string, shopId: string, now = Date.now()): string | null {
	const parts = token.split('.');
	if (parts.length !== 4) return null;
	const [shop, month, exp, sig] = parts;
	const expected = Buffer.from(sign(`${shop}.${month}.${exp}`));
	const given = Buffer.from(sig);
	if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
	if (shop !== shopId || !/^\d{4}-\d{2}$/.test(month) || Number(exp) * 1000 < now) return null;
	return month;
}

const previousMonth = (now: Date) => {
	const local = new Intl.DateTimeFormat('en-CA', {
		timeZone: SHOP_TZ,
		year: 'numeric',
		month: '2-digit'
	}).format(now);
	const [y, m] = local.split('-').map(Number);
	return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

/** Cron, 1st of the month: e-mails the accountant a link to last month's notes. */
export async function sendMonthlyExport(now = new Date()) {
	const settings = await getFiscalSettings();
	const to = await accountantEmail();
	if (!settings.enabled || !to) return 'skipped';
	const month = previousMonth(now);
	const shopId = currentShopId();
	const link = `${await shopOrigin(shopId)}/api/v1/fiscal-export/${exportToken(shopId, month)}`;
	const shop = (await getStoreProfile()).displayName;
	const [y, m] = month.split('-');
	await db().begin(async (tx) => {
		await queueMessage(tx, {
			channel: 'email',
			to,
			template: '_text',
			vars: {
				subject: `Notas fiscais ${m}/${y} – ${shop}`,
				body: `Olá! As NFC-e de ${m}/${y} da ${shop} (XMLs e resumo em CSV) estão neste link, válido por 45 dias:\n\n${link}`
			}
		});
	});
	return 'sent';
}
