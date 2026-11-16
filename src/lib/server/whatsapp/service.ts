// WhatsApp in and out: the webhook (challenge and signed messages), the bot's replies, and the
// order status messages. [UNVERIFIED] TODO(verify): the webhook payload shape with one real message.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { botReply, mayMessage, statusTemplate, type BotTexts } from '#lib/domain/whatsapp-bot.ts';
import type { OrderStatus } from '#lib/domain/order-status.ts';
import { normalizeBrPhone } from '#lib/domain/phone.ts';
import { currentShopId, db } from '../db';
import { enqueue, QUEUES } from '../jobs';
import { queueMessage } from '../messaging/outbox';
import { getShopSecret } from '../platform/secrets';
import { shopOrigin } from '../platform/shops';
import { inHoursNow } from '../settings/hours';
import { getStoreProfile } from '../settings/profile';
import { getStoreSettings } from '../settings/service';
import { getTexts } from '../settings/texts';
import { whatsappEnabled, whatsappSettings } from './settings';

/** X-Hub-Signature-256: "sha256=" + HMAC-SHA256 of the raw body with the app secret, hex. */
export function verifyWhatsappSignature(
	raw: Uint8Array,
	header: string | null,
	appSecret: string | null
): boolean {
	if (!header || !appSecret) return false;
	const given = header
		.trim()
		.toLowerCase()
		.replace(/^sha256=/, '');
	const expected = createHmac('sha256', appSecret).update(raw).digest('hex');
	return (
		given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
	);
}

/** Meta's subscription check: answer hub.challenge when the verify token matches. */
export async function whatsappChallenge(params: URLSearchParams): Promise<string | null> {
	if (params.get('hub.mode') !== 'subscribe') return null;
	const s = await whatsappSettings();
	const token = params.get('hub.verify_token') ?? '';
	if (token.length !== s.verifyToken.length) return null;
	if (!timingSafeEqual(Buffer.from(token), Buffer.from(s.verifyToken))) return null;
	return params.get('hub.challenge');
}

interface WaMessage {
	id: string;
	from: string;
	type: string;
	timestamp?: string;
	text?: { body: string };
	button?: { text: string };
	interactive?: { button_reply?: { title: string }; list_reply?: { title: string } };
}
interface WaStatus {
	id: string;
	status: string;
	errors?: { title?: string; message?: string }[];
}
interface WaWebhook {
	entry?: { changes?: { value?: { messages?: WaMessage[]; statuses?: WaStatus[] } }[] }[];
}

export async function receiveWhatsappWebhook(raw: Uint8Array, headers: Headers) {
	if (!(await whatsappEnabled())) return { status: 404 };
	const secret = await getShopSecret('whatsapp_app_secret');
	if (!verifyWhatsappSignature(raw, headers.get('x-hub-signature-256'), secret))
		return { status: 401 };
	let body: WaWebhook;
	try {
		body = JSON.parse(new TextDecoder().decode(raw)) as WaWebhook;
	} catch {
		return { status: 400 };
	}
	const values = (body.entry ?? []).flatMap((e) => (e.changes ?? []).map((c) => c.value ?? {}));
	await db().begin(async (tx) => {
		for (const m of values.flatMap((v) => v.messages ?? [])) {
			if (!m?.id || !m.from) continue;
			const [ev] = await tx<{ id: string }[]>`
				insert into channel_events (channel, provider_event_id, event_type, delivery_method,
					signature_valid, payload)
				values ('whatsapp', ${m.id}, 'message', 'webhook', true, ${tx.json(m as never)})
				on conflict (channel, provider_event_id) do nothing returning id`;
			if (ev) await enqueue(tx, QUEUES.whatsappInbound, { channelEventId: ev.id });
		}
		// Delivery reports: only a failure is worth keeping.
		for (const s of values.flatMap((v) => v.statuses ?? [])) {
			if (s?.status !== 'failed') continue;
			const why = s.errors?.map((e) => e.message ?? e.title).join('; ') || 'failed';
			await tx`update message_outbox set status = 'failed', error = ${why}
				where provider_ref = ${s.id}`;
		}
	});
	return { status: 200 };
}

function messageText(m: WaMessage): string {
	return (
		m.text?.body ??
		m.button?.text ??
		m.interactive?.button_reply?.title ??
		m.interactive?.list_reply?.title ??
		''
	);
}

/** Worker: answers one customer message. */
export async function processWhatsappInbound(channelEventId: string) {
	return db().begin(async (tx) => {
		const [ev] = await tx<{ payload: WaMessage; processing_status: string }[]>`
			select payload, processing_status from channel_events
			where id = ${channelEventId} and channel = 'whatsapp' for update`;
		if (!ev || ev.processing_status !== 'received') return 'skipped';
		const phone = normalizeBrPhone(ev.payload.from) ?? `+${ev.payload.from.replace(/\D/g, '')}`;
		await tx`insert into whatsapp_conversations (phone_e164) values (${phone})
			on conflict (shop_id, phone_e164) do update set last_inbound_at = now()`;

		const texts = await getTexts(tx);
		const [last] = await tx<{ order_number: number; status: OrderStatus }[]>`
			select o.order_number, o.status from orders o join customers c on c.id = o.customer_id
			where (c.phone_e164 = ${phone} or c.contact_phone_e164 = ${phone}) and c.deleted_at is null
			order by o.created_at desc limit 1`;
		const token = randomBytes(12).toString('hex');
		await tx`insert into whatsapp_links (token, phone_e164) values (${token}, ${phone})`;
		const store = await getStoreSettings(tx);
		const botTexts: BotTexts = {
			greeting: texts['wa.greeting'],
			open: texts['wa.open'],
			closed: texts['wa.closed'],
			status: texts['wa.status'],
			noOrder: texts['wa.noOrder'],
			human: texts['wa.human']
		};
		const reply = botReply(
			messageText(ev.payload),
			{
				shopName: (await getStoreProfile(tx)).displayName,
				open: store.acceptingOrders && (await inHoursNow(tx)),
				menuUrl: `${await shopOrigin(currentShopId())}/cardapio?wa=${token}`,
				lastOrder: last
					? { number: last.order_number, statusLabel: texts[`status.${last.status}`] }
					: null
			},
			botTexts
		);
		if (reply.flagStaff)
			await tx`update whatsapp_conversations set needs_staff_at = now() where phone_e164 = ${phone}`;
		// A reply inside the 24-hour window the customer just opened: free text.
		await queueMessage(tx, {
			channel: 'whatsapp',
			to: phone,
			template: '_text',
			vars: { body: reply.text }
		});
		await tx`update channel_events set processing_status = 'processed', processed_at = now(),
			attempts = attempts + 1 where id = ${channelEventId}`;
		return reply.intent;
	});
}

export type OrderMessageEvent = 'placed' | 'ready' | 'out' | 'cancelled';

/** Worker: the status message for an order event, when the customer may get one. */
export async function notifyOrderEvent(orderId: string, event: OrderMessageEvent) {
	if (!(await whatsappEnabled())) return 'skipped';
	return db().begin(async (tx) => {
		const [o] = await tx<
			{
				order_number: number;
				channel: string;
				fulfillment_type: string;
				fulfillment_provider: string;
				name: string | null;
				phone: string | null;
				whatsapp_updates_at: Date | null;
			}[]
		>`
			select o.order_number, o.channel, o.fulfillment_type, o.fulfillment_provider,
				coalesce(o.customer_label, c.name) as name,
				coalesce(c.phone_e164, c.contact_phone_e164) as phone, c.whatsapp_updates_at
			from orders o left join customers c on c.id = o.customer_id and c.deleted_at is null
			where o.id = ${orderId}`;
		// Delivery apps tell their own customers; their contacts are not ours to message.
		if (!o?.phone || o.channel === 'ifood' || o.channel === 'opendelivery') return 'skipped';
		// With own couriers, "saiu para entrega" goes out when the run leaves, not when it is ready.
		if (
			event === 'ready' &&
			o.fulfillment_type === 'delivery' &&
			o.fulfillment_provider === 'own_driver' &&
			(await tx`select 1 from couriers where active limit 1`).length > 0
		)
			return 'skipped';
		const [conv] = await tx<{ last_inbound_at: Date }[]>`
			select last_inbound_at from whatsapp_conversations where phone_e164 = ${o.phone}`;
		if (!mayMessage(o.whatsapp_updates_at, conv?.last_inbound_at ?? null)) return 'skipped';
		const template = statusTemplate(event, {
			type: o.fulfillment_type,
			provider: o.fulfillment_provider
		});
		const id = await queueMessage(tx, {
			channel: 'whatsapp',
			to: o.phone,
			template,
			vars: {
				nome: (o.name ?? '').split(' ')[0] || 'cliente',
				numero: String(o.order_number),
				loja: (await getStoreProfile(tx)).displayName
			},
			orderId
		});
		return id ? 'queued' : 'skipped';
	});
}

/** Conversations where the customer asked for a person. */
export async function waitingConversations() {
	if (!(await whatsappEnabled())) return [];
	return db()<{ phone: string; since: Date }[]>`
		select phone_e164 as phone, needs_staff_at as since from whatsapp_conversations
		where needs_staff_at is not null order by needs_staff_at limit 20`;
}

export async function markConversationHandled(phone: string) {
	await db()`update whatsapp_conversations set needs_staff_at = null where phone_e164 = ${phone}`;
}

/** The phone tied to a menu link from the bot, while it is valid. */
export async function whatsappLinkPhone(token: string | undefined): Promise<string | null> {
	if (!token || !/^[0-9a-f]{24}$/.test(token)) return null;
	const [l] = await db()<{ phone_e164: string }[]>`
		select phone_e164 from whatsapp_links where token = ${token} and expires_at > now()`;
	return l?.phone_e164 ?? null;
}

export async function attachWhatsappLink(token: string | undefined, orderId: string) {
	if (!token || !/^[0-9a-f]{24}$/.test(token)) return;
	await db()`update whatsapp_links set order_id = ${orderId}
		where token = ${token} and expires_at > now() and order_id is null`;
}
