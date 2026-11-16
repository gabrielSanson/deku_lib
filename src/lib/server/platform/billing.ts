// The platform's monthly fee for each shop. v1 (manual_pix): an invoice with a static Pix code to
// the platform's key, e-mailed to the shop's admins and shown in Configurações → Plano e cobrança;
// a platform admin marks it paid in the console. Platform code: uses the main pool.
import nodemailer from 'nodemailer';
import {
	billingPeriod,
	dueAt,
	invoiceReference,
	statusForUnpaid,
	type ShopBillingStatus
} from '#lib/domain/billing.ts';
import { buildPixCode } from '#lib/domain/pix.ts';
import { formatBRL } from '#lib/domain/money.ts';
import { audit, type Actor } from '../audit';
import { config } from '../config';
import { DEFAULT_SHOP_ID, platformDb, withShop } from '../db';
import { invalidateShopCache } from './shops';

/** A way to charge shops. Only manual Pix exists; a PSP (Pix Automático, boleto, card) is later. */
export interface BillingProvider {
	name: string;
	createCharge(invoice: {
		id: string;
		amountCents: number;
	}): Promise<{ pixPayload: string | null; ref: string | null }>;
	getStatus(ref: string): Promise<'open' | 'paid' | 'void'>;
	parseWebhook(raw: Uint8Array): Promise<{ ref: string; status: 'paid' | 'void' } | null>;
}

export interface PlatformSettings {
	pixKey: string | null;
	pixMerchantName: string | null;
	pixMerchantCity: string | null;
	graceDays: number;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
	const [r] = await platformDb()<
		{
			pix_key: string | null;
			pix_merchant_name: string | null;
			pix_merchant_city: string | null;
			grace_days: number;
		}[]
	>`select pix_key, pix_merchant_name, pix_merchant_city, grace_days from platform_settings where id = 1`;
	return {
		pixKey: r?.pix_key ?? null,
		pixMerchantName: r?.pix_merchant_name ?? null,
		pixMerchantCity: r?.pix_merchant_city ?? null,
		graceDays: r?.grace_days ?? 7
	};
}

export async function savePlatformSettings(s: PlatformSettings, actor: Actor) {
	await platformDb()`
		update platform_settings set pix_key = ${s.pixKey}, pix_merchant_name = ${s.pixMerchantName},
			pix_merchant_city = ${s.pixMerchantCity}, grace_days = ${s.graceDays}, updated_at = now()
		where id = 1`;
	await audit(platformDb(), actor, 'platform.settings_saved', 'platform_settings', null, {
		grace_days: s.graceDays
	});
}

export const manualPix = (settings: PlatformSettings): BillingProvider => ({
	name: 'manual_pix',
	async createCharge(invoice) {
		if (
			!settings.pixKey ||
			!settings.pixMerchantName ||
			!settings.pixMerchantCity ||
			invoice.amountCents <= 0
		) {
			return { pixPayload: null, ref: null };
		}
		return {
			pixPayload: buildPixCode({
				key: settings.pixKey,
				merchantName: settings.pixMerchantName,
				merchantCity: settings.pixMerchantCity,
				amountCents: invoice.amountCents,
				reference: invoiceReference(invoice.id)
			}),
			ref: invoiceReference(invoice.id)
		};
	},
	async getStatus() {
		return 'open';
	},
	async parseWebhook() {
		return null;
	}
});

export interface InvoiceView {
	id: string;
	shopId: string;
	plan: string;
	periodStart: string;
	periodEnd: string;
	amountCents: number;
	status: 'open' | 'paid' | 'void';
	dueAt: Date;
	paidAt: Date | null;
	pixPayload: string | null;
}

interface InvoiceRow {
	id: string;
	shop_id: string;
	plan: string;
	period_start: string;
	period_end: string;
	amount_cents: number;
	status: 'open' | 'paid' | 'void';
	due_at: Date;
	paid_at: Date | null;
	pix_payload: string | null;
}

const view = (r: InvoiceRow): InvoiceView => ({
	id: r.id,
	shopId: r.shop_id,
	plan: r.plan,
	periodStart: r.period_start,
	periodEnd: r.period_end,
	amountCents: r.amount_cents,
	status: r.status,
	dueAt: r.due_at,
	paidAt: r.paid_at,
	pixPayload: r.pix_payload
});

export async function invoicesOfShop(shopId: string, limit = 24): Promise<InvoiceView[]> {
	const rows = await platformDb()<InvoiceRow[]>`
		select id, shop_id, plan, period_start::text, period_end::text, amount_cents, status, due_at, paid_at, pix_payload
		from invoices where shop_id = ${shopId} order by period_start desc limit ${limit}`;
	return rows.map(view);
}

function spDay(now: Date): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
}

/**
 * Monthly run (1st, 06:00 São Paulo): one open invoice for the month for every shop whose trial
 * has ended. Running it again the same month does nothing new.
 */
export async function createMonthlyInvoices(now = new Date(), mail = mailInvoice) {
	const period = billingPeriod(spDay(now));
	const settings = await getPlatformSettings();
	const provider = manualPix(settings);
	const shops = await platformDb()<{ id: string; plan: string; price_cents: number }[]>`
		select s.id, s.plan, p.price_cents from shops s join plans p on p.code = s.plan
		where s.status in ('trial', 'active', 'past_due', 'suspended')
			-- Shop #1 is the install's own shop: it never pays the platform.
			and s.id <> ${DEFAULT_SHOP_ID}
			and coalesce(s.trial_ends_at, s.created_at) <= ${now}
			and not exists (select 1 from invoices i where i.shop_id = s.id and i.period_start = ${period.start})`;
	let created = 0;
	for (const s of shops) {
		const [inv] = await platformDb()<{ id: string }[]>`
			insert into invoices (shop_id, plan, period_start, period_end, amount_cents, due_at)
			values (${s.id}, ${s.plan}, ${period.start}, ${period.end}, ${s.price_cents}, ${dueAt(period.start)})
			on conflict (shop_id, period_start) do nothing returning id`;
		if (!inv) continue;
		const charge = await provider.createCharge({ id: inv.id, amountCents: s.price_cents });
		await platformDb()`update invoices set pix_payload = ${charge.pixPayload}, provider_ref = ${charge.ref}
			where id = ${inv.id}`;
		// The trial is over once the first invoice exists.
		await platformDb()`update shops set status = 'active' where id = ${s.id} and status = 'trial'`;
		created++;
		await mail(s.id, inv.id).catch((err) =>
			console.error(
				JSON.stringify({ msg: 'invoice e-mail failed', shopId: s.id, err: String(err) })
			)
		);
	}
	if (created) invalidateShopCache();
	return { created, period };
}

/** Daily run: late shops get a warning (past_due), then are suspended; paid-up shops return to active. */
export async function applyLateStatuses(now = new Date()) {
	const { graceDays } = await getPlatformSettings();
	const shops = await platformDb()<
		{ id: string; status: ShopBillingStatus; oldest_due: Date | null }[]
	>`
		select s.id, s.status,
			(select min(i.due_at) from invoices i where i.shop_id = s.id and i.status = 'open') as oldest_due
		from shops s where s.status in ('active', 'past_due', 'suspended') and s.id <> ${DEFAULT_SHOP_ID}`;
	let changed = 0;
	for (const s of shops) {
		const next = statusForUnpaid(s.status, s.oldest_due, graceDays, now);
		if (next === s.status) continue;
		await platformDb()`update shops set status = ${next} where id = ${s.id}`;
		await withShop(s.id, (sql) =>
			audit(sql, { type: 'platform', id: null }, 'shop.billing_status', 'shop', s.id, {
				from: s.status,
				to: next
			})
		);
		changed++;
	}
	if (changed) invalidateShopCache();
	return { changed };
}

/** Platform console: the shop paid. Reactivates it if nothing else is late. */
export async function markInvoicePaid(invoiceId: string, actor: Actor, now = new Date()) {
	const [inv] = await platformDb()<{ shop_id: string }[]>`
		update invoices set status = 'paid', paid_at = ${now}, marked_paid_by = ${actor.id}
		where id = ${invoiceId} and status = 'open' returning shop_id`;
	if (!inv) return false;
	await withShop(inv.shop_id, (sql) => audit(sql, actor, 'invoice.paid', 'invoice', invoiceId, {}));
	await applyLateStatuses(now);
	return true;
}

/** E-mails the invoice to the shop's active admins (needs SMTP_URL). */
export async function mailInvoice(shopId: string, invoiceId: string) {
	const { SMTP_URL, ALERT_FROM } = config();
	if (!SMTP_URL) return;
	const [inv] = await platformDb()<(InvoiceRow & { shop_name: string })[]>`
		select i.*, i.period_start::text, i.period_end::text, s.name as shop_name
		from invoices i join shops s on s.id = i.shop_id where i.id = ${invoiceId}`;
	const to = await platformDb()<{ email: string }[]>`
		select u.email from shop_members m join auth.users u on u.id = m.user_id
		where m.shop_id = ${shopId} and m.role = 'admin' and m.active and u.email is not null`;
	if (!inv || to.length === 0) return;
	const lines = [
		`Mensalidade de ${inv.shop_name}: ${formatBRL(inv.amount_cents)}.`,
		`Vencimento: ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(inv.due_at)}.`,
		inv.pix_payload
			? `Pix copia e cola:\n${inv.pix_payload}`
			: 'O código Pix está em Configurações → Plano e cobrança.',
		'Também dá para pagar pela tela Configurações → Plano e cobrança da loja.'
	];
	await nodemailer.createTransport(SMTP_URL).sendMail({
		from: ALERT_FROM ?? to[0].email,
		to: to.map((t) => t.email),
		subject: `Mensalidade ${inv.period_start.slice(0, 7)} · ${inv.shop_name}`,
		text: lines.join('\n\n')
	});
}
