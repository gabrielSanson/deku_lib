// "Avisar quando ficar pronto": web push to the customer's phone, sent when the
// kitchen marks the order ready and again on each "Chamar". The subscription
// belongs to one order, is used only for its ready alert and is removed once
// the order is done. The shop's VAPID keys are made on first use.
import webpush from 'web-push';
import type { Fulfillment } from '#lib/domain/fulfillment.ts';
import { TERMINAL_STATUSES, type OrderStatus } from '#lib/domain/order-status.ts';
import { getsReadyAlert, pickupCode } from '#lib/domain/pickup.ts';
import { fill } from '#lib/texts/catalog.ts';
import { audit, SYSTEM } from '../audit';
import { db, type Db } from '../db';
import { DomainError } from '../errors';
import { canStoreSecrets, decryptSecret, encryptSecret } from '../secrets';
import { getTexts } from '../settings/texts';

const MAX_PER_ORDER = 5;

async function vapidKeys(sql: Db): Promise<{ publicKey: string; privateKey: string } | null> {
	if (!canStoreSecrets()) return null;
	type Keys = { publicKey: string; privateKey: string };
	const read = async (): Promise<Keys | { stale: string } | null> => {
		const [row] = await sql<{ public_key: string; private_key_enc: string }[]>`
			select public_key, private_key_enc from web_push_keys where id = 1`;
		if (!row) return null;
		try {
			return { publicKey: row.public_key, privateKey: decryptSecret(row.private_key_enc) };
		} catch {
			// APP_SECRET changed since the keys were made, so the private key can't be read.
			return { stale: row.private_key_enc };
		}
	};
	const existing = await read();
	if (existing && !('stale' in existing)) return existing;
	const fresh = webpush.generateVAPIDKeys();
	if (existing) {
		// Phones subscribed with the old key could not get alerts anyway; new orders use the new key.
		await sql`
			update web_push_keys
			set public_key = ${fresh.publicKey}, private_key_enc = ${encryptSecret(fresh.privateKey)}
			where id = 1 and private_key_enc = ${existing.stale}`;
	} else {
		// Two first visits at once: the first insert wins and both read it back.
		await sql`
			insert into web_push_keys (id, public_key, private_key_enc)
			values (1, ${fresh.publicKey}, ${encryptSecret(fresh.privateKey)})
			on conflict (id) do nothing`;
	}
	const keys = await read();
	return keys && !('stale' in keys) ? keys : null;
}

/** The key the browser needs to subscribe, or null when push can't work on this server. */
export async function pushPublicKey(sql: Db = db()): Promise<string | null> {
	return (await vapidKeys(sql))?.publicKey ?? null;
}

export interface PushSubscriptionInput {
	endpoint: string;
	p256dh: string;
	auth: string;
}

/** Saves a phone's subscription on an open order collected at the counter. */
export async function savePushSubscription(publicToken: string, sub: PushSubscriptionInput) {
	const sql = db();
	const [order] = await sql<{ id: string; status: OrderStatus; fulfillment_type: Fulfillment }[]>`
		select id, status, fulfillment_type from orders where public_token = ${publicToken}`;
	if (!order || TERMINAL_STATUSES.includes(order.status) || !getsReadyAlert(order.fulfillment_type))
		throw new DomainError('err.push.noAlert', { code: 'no_alert', status: 409 });
	const [{ n }] = await sql<{ n: number }[]>`
		select count(*)::int as n from order_push_subscriptions where order_id = ${order.id}`;
	if (n >= MAX_PER_ORDER)
		throw new DomainError('err.push.tooMany', { code: 'too_many', status: 429 });
	await sql`
		insert into order_push_subscriptions (order_id, endpoint, p256dh, auth)
		values (${order.id}, ${sub.endpoint}, ${sub.p256dh}, ${sub.auth})
		on conflict (order_id, endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth`;
}

/** Worker: send the ready alert to every phone that asked for it. Safe to repeat. */
export async function sendReadyPush(orderId: string) {
	const sql = db();
	const [order] = await sql<{ order_number: number; public_token: string; status: string }[]>`
		select order_number, public_token, status from orders where id = ${orderId}`;
	if (!order || order.status !== 'ready') return { sent: 0, failed: 0 };
	const subs = await sql<{ id: string; endpoint: string; p256dh: string; auth: string }[]>`
		select id, endpoint, p256dh, auth from order_push_subscriptions where order_id = ${orderId}`;
	if (subs.length === 0) return { sent: 0, failed: 0 };
	const keys = await vapidKeys(sql);
	if (!keys) return { sent: 0, failed: subs.length };

	const texts = await getTexts(sql);
	const code = pickupCode(order.order_number);
	const payload = JSON.stringify({
		title: texts['push.ready.title'],
		body: fill(texts['push.ready.body'], { number: code }),
		url: `/orders/${order.public_token}`,
		tag: `order-${code}`
	});
	let sent = 0;
	let failed = 0;
	for (const s of subs) {
		try {
			await webpush.sendNotification(
				{ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
				payload,
				{
					TTL: 600,
					urgency: 'high',
					vapidDetails: {
						subject: 'mailto:noreply@deku.local',
						publicKey: keys.publicKey,
						privateKey: keys.privateKey
					}
				}
			);
			await sql`update order_push_subscriptions set last_sent_at = now(), last_error = null where id = ${s.id}`;
			sent++;
		} catch (err) {
			const status = (err as { statusCode?: number }).statusCode;
			failed++;
			// 404/410: the phone dropped the subscription; it will never work again.
			if (status === 404 || status === 410) {
				await sql`delete from order_push_subscriptions where id = ${s.id}`;
			} else {
				await sql`update order_push_subscriptions set last_error = ${String(status ?? err)} where id = ${s.id}`;
			}
		}
	}
	if (failed) await audit(sql, SYSTEM, 'order.push_failed', 'order', orderId, { sent, failed });
	return { sent, failed };
}

/** Subscriptions live only as long as the order is open. */
export async function dropPushSubscriptions(sql: Db, orderId: string) {
	await sql`delete from order_push_subscriptions where order_id = ${orderId}`;
}
