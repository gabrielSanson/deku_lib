// Campanhas → Mensagens: a marketing message to the contacts who accept offers (mayMarket), by
// WhatsApp marketing template or e-mail. Every message carries a one-tap opt-out link; sends are
// spread out (THROTTLE_PER_SECOND) and audited.
import { fill } from '#lib/texts/catalog.ts';
import { audit, type Actor } from '../audit';
import { db } from '../db';
import { DomainError } from '../errors';
import { listCustomers, type CustomerQuery, type CustomerRow } from '../customers/list';
import { queueMessage } from '../messaging/outbox';
import { getTexts } from '../settings/texts';
import { whatsappEnabled } from '../whatsapp/settings';

export const THROTTLE_PER_SECOND = 10;

export type MarketingChannel = 'whatsapp' | 'email';

export interface MarketingInput {
	channel: MarketingChannel;
	/** WhatsApp: the approved marketing template's name. */
	template?: string;
	/** E-mail: subject and text; {nome} becomes the first name. */
	subject?: string;
	body?: string;
	audience: Pick<CustomerQuery, 'filter' | 'source' | 'q'>;
}

function reachable(rows: CustomerRow[], channel: MarketingChannel) {
	return rows.filter((r) => (channel === 'email' ? !!r.email : !!r.phone));
}

export async function marketingPrice(): Promise<number> {
	const [r] = await db()<{ marketing_price_cents: number }[]>`
		select marketing_price_cents from whatsapp_settings where shop_id = current_shop_id()`;
	return r?.marketing_price_cents ?? 35;
}

/** How many contacts the message would reach, and what WhatsApp would charge (estimate). */
export async function marketingAudience(
	channel: MarketingChannel,
	audience: MarketingInput['audience']
) {
	const rows = reachable(
		await listCustomers({ ...audience, marketable: true, limit: 100_000 }),
		channel
	);
	const price = channel === 'whatsapp' ? await marketingPrice() : 0;
	return { count: rows.length, costCents: rows.length * price, priceCents: price };
}

export async function sendMarketing(input: MarketingInput, actor: Actor, origin: string) {
	if (input.channel === 'whatsapp') {
		if (!(await whatsappEnabled())) throw new DomainError('err.marketing.noWhatsapp');
		if (!input.template || !/^[a-z0-9_]{1,512}$/.test(input.template))
			throw new DomainError('err.marketing.template');
	} else if (!input.subject?.trim() || !input.body?.trim()) {
		throw new DomainError('err.marketing.text');
	}
	const rows = reachable(
		await listCustomers({ ...input.audience, marketable: true, limit: 100_000 }),
		input.channel
	);
	if (!rows.length) throw new DomainError('err.marketing.nobody');
	const price = input.channel === 'whatsapp' ? await marketingPrice() : 0;
	const texts = await getTexts();
	return db().begin(async (tx) => {
		const [send] = await tx<{ id: string }[]>`
			insert into marketing_sends (channel, template, subject, body, audience, recipients,
				estimated_cost_cents, created_by)
			values (${input.channel}, ${input.template ?? null}, ${input.subject ?? null}, ${input.body ?? null},
				${tx.json(input.audience as never)}, ${rows.length}, ${rows.length * price}, ${actor.id})
			returning id`;
		const tokens = new Map(
			(
				await tx<{ id: string; opt_out_token: string }[]>`
					select id, opt_out_token from customers where id = any(${rows.map((r) => r.id)})`
			).map((r) => [r.id, r.opt_out_token])
		);
		for (const [i, r] of rows.entries()) {
			const nome = (r.name ?? '').split(' ')[0] || 'cliente';
			const sair = `${origin}/sair/${tokens.get(r.id)}`;
			const startAfter = Math.floor(i / THROTTLE_PER_SECOND);
			if (input.channel === 'whatsapp') {
				// TODO(verify): the template's variables are {{1}} = first name, {{2}} = opt-out link.
				await queueMessage(tx, {
					channel: 'whatsapp',
					to: r.phone!,
					template: input.template!,
					vars: { nome, sair },
					sendId: send.id,
					startAfter
				});
			} else {
				await queueMessage(tx, {
					channel: 'email',
					to: r.email!,
					template: '_text',
					vars: {
						subject: fill(input.subject!, { nome }),
						body: `${fill(input.body!, { nome })}\n\n${fill(texts['marketing.optOutLine'], { link: sair })}`
					},
					sendId: send.id,
					startAfter
				});
			}
		}
		await audit(tx, actor, 'marketing.sent', 'marketing_send', send.id, {
			channel: input.channel,
			recipients: rows.length,
			audience: input.audience
		});
		return { id: send.id, recipients: rows.length };
	});
}

export async function recentSends() {
	return db()<
		{
			id: string;
			channel: string;
			template: string | null;
			subject: string | null;
			recipients: number;
			estimated_cost_cents: number;
			created_at: Date;
			sent: number;
			failed: number;
		}[]
	>`
		select s.id, s.channel, s.template, s.subject, s.recipients, s.estimated_cost_cents, s.created_at,
			count(m.id) filter (where m.status = 'sent')::int as sent,
			count(m.id) filter (where m.status = 'failed')::int as failed
		from marketing_sends s left join message_outbox m on m.send_id = s.id
		group by s.id order by s.created_at desc limit 20`;
}

/** The one-tap link in every marketing message. */
export async function optOut(token: string): Promise<boolean> {
	if (!/^[0-9a-f]{24}$/.test(token)) return false;
	const [r] = await db()<{ id: string }[]>`
		update customers set marketing_opt_out_at = coalesce(marketing_opt_out_at, now())
		where opt_out_token = ${token} returning id`;
	if (r)
		await audit(db(), { type: 'customer', id: r.id }, 'customer.opted_out', 'customer', r.id, {});
	return !!r;
}

export async function setMarketingPrice(cents: number) {
	await db()`update whatsapp_settings set marketing_price_cents = ${cents} where shop_id = current_shop_id()`;
}
