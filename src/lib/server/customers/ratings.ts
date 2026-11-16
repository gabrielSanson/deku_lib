// "Como foi?": one hour after an order is completed the customer gets a link to rate it from
// 1 to 5 stars (WhatsApp while the 24 h window is open, otherwise e-mail; the tracking page
// always shows it). Ratings are private. A rating of 3 or less e-mails the alert recipients
// and stays flagged on the staff home until someone marks it seen.
import { fill } from '#lib/texts/catalog.ts';
import { getAlertSettings } from '../alerts/service';
import { audit, type Actor } from '../audit';
import { currentShopId, db } from '../db';
import { DomainError } from '../errors';
import { queueMessage } from '../messaging/outbox';
import { shopOrigin } from '../platform/shops';
import { getStoreProfile } from '../settings/profile';
import { getTexts } from '../settings/texts';
import { whatsappEnabled } from '../whatsapp/settings';

export const LOW_RATING = 3;
export const RATING_DELAY_SECONDS = 60 * 60;
const CHANNEL_APPS = ['ifood', 'opendelivery'];

/** Orders a customer of the shop may rate: completed, not a test, not from a delivery app. */
function rateable(o: { status: string; channel: string; is_test: boolean }) {
	return o.status === 'completed' && !o.is_test && !CHANNEL_APPS.includes(o.channel);
}

/** The job: sends the "Como foi?" link once, by WhatsApp in the window or by e-mail. */
export async function requestRating(orderId: string): Promise<'queued' | 'skipped'> {
	return db().begin(async (tx) => {
		const [o] = await tx<
			{
				status: string;
				channel: string;
				is_test: boolean;
				public_token: string;
				order_number: number;
				name: string | null;
				phone: string | null;
				email: string | null;
				rated: boolean;
				requested: boolean;
			}[]
		>`
			select o.rating_requested_at is not null as requested, o.status, o.channel, o.is_test, o.public_token, o.order_number,
				coalesce(o.customer_label, c.name) as name,
				coalesce(c.phone_e164, c.contact_phone_e164) as phone, c.email,
				exists (select 1 from order_ratings r where r.order_id = o.id) as rated
			from orders o left join customers c on c.id = o.customer_id and c.deleted_at is null
			where o.id = ${orderId} for update of o`;
		if (!o || o.rated || o.requested || !rateable(o)) return 'skipped';
		await tx`update orders set rating_requested_at = now() where id = ${orderId}`;
		const texts = await getTexts(tx);
		const vars = {
			nome: (o.name ?? '').split(' ')[0] || 'cliente',
			numero: String(o.order_number),
			loja: (await getStoreProfile(tx)).displayName,
			link: `${await shopOrigin(currentShopId())}/avaliar/${o.public_token}`
		};
		if (o.phone && (await whatsappEnabled())) {
			// Free text is only allowed while the customer's last message is under 24 h old.
			const [conv] = await tx<{ open: boolean }[]>`
				select last_inbound_at > now() - interval '24 hours' as open
				from whatsapp_conversations where phone_e164 = ${o.phone}`;
			if (conv?.open) {
				const id = await queueMessage(tx, {
					channel: 'whatsapp',
					to: o.phone,
					template: '_text',
					vars: { body: fill(texts['rating.message'], vars) },
					orderId
				});
				return id ? 'queued' : 'skipped';
			}
		}
		if (!o.email) return 'skipped';
		const id = await queueMessage(tx, {
			channel: 'email',
			to: o.email,
			template: '_text',
			vars: {
				subject: fill(texts['rating.mail.subject'], vars),
				body: fill(texts['rating.message'], vars)
			},
			orderId
		});
		return id ? 'queued' : 'skipped';
	});
}

/** What the /avaliar page needs; null when the link is not valid. */
export async function ratingPage(token: string) {
	if (!/^[0-9a-f]{36}$/.test(token)) return null;
	const [o] = await db()<
		{
			status: string;
			channel: string;
			is_test: boolean;
			order_number: number;
			stars: number | null;
		}[]
	>`
		select o.status, o.channel, o.is_test, o.order_number, r.stars
		from orders o left join order_ratings r on r.order_id = o.id
		where o.public_token = ${token}`;
	if (!o) return null;
	return { orderNumber: o.order_number, rateable: rateable(o), stars: o.stars };
}

export async function rateOrder(token: string, stars: number, comment?: string | null) {
	if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new DomainError('err.rating.stars');
	const text = comment?.trim().slice(0, 1000) || null;
	return db().begin(async (tx) => {
		const [o] = await tx<
			{ id: string; status: string; channel: string; is_test: boolean; order_number: number }[]
		>`select id, status, channel, is_test, order_number from orders where public_token = ${token}`;
		if (!o || !rateable(o)) throw new DomainError('err.rating.notRateable');
		const [r] = await tx<{ order_id: string }[]>`
			insert into order_ratings (order_id, stars, comment) values (${o.id}, ${stars}, ${text})
			on conflict (order_id) do nothing returning order_id`;
		if (!r) throw new DomainError('err.rating.done');
		if (stars <= LOW_RATING) {
			const { emailTo } = await getAlertSettings(tx);
			const texts = await getTexts(tx);
			const vars = {
				numero: String(o.order_number),
				estrelas: String(stars),
				comentario: text ?? '—'
			};
			for (const to of emailTo)
				await queueMessage(tx, {
					channel: 'email',
					to,
					template: '_text',
					vars: {
						subject: fill(texts['rating.low.subject'], vars),
						body: fill(texts['rating.low.body'], vars)
					}
				});
		}
	});
}

/** The staff home: average of the last 30 days and the low ratings nobody has seen. */
export async function ratingSummary(days = 30) {
	const sql = db();
	const [s] = await sql<{ average: number | null; count: number }[]>`
		select round(avg(stars)::numeric, 1)::float as average, count(*)::int as count
		from order_ratings where created_at > now() - make_interval(days => ${days})`;
	const low = await sql<
		{
			orderId: string;
			orderNumber: number;
			stars: number;
			comment: string | null;
			createdAt: Date;
		}[]
	>`
		select r.order_id as "orderId", o.order_number as "orderNumber", r.stars, r.comment,
			r.created_at as "createdAt"
		from order_ratings r join orders o on o.id = r.order_id
		where r.stars <= ${LOW_RATING} and r.seen_at is null
		order by r.created_at desc limit 10`;
	return { average: s.average, count: s.count, low };
}

export async function markRatingSeen(orderId: string, actor: Actor) {
	await db().begin(async (tx) => {
		const [r] = await tx<{ order_id: string }[]>`
			update order_ratings set seen_at = now(), seen_by = ${actor.id}
			where order_id = ${orderId} and seen_at is null returning order_id`;
		if (r) await audit(tx, actor, 'rating.seen', 'order', orderId, {});
	});
}
