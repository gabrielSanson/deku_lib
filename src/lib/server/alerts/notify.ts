// How an alert reaches the owner: e-mail over SMTP (SMTP_URL) and Web Push to the devices
// where an admin tapped "Receber alertas neste aparelho". Either may be missing; the alert is
// still recorded and shown on the staff home.
import nodemailer from 'nodemailer';
import webpush from 'web-push';
import { fill } from '#lib/texts/catalog.ts';
import { config } from '../config';
import { db, type Db } from '../db';
import { vapidKeys } from '../notifications/push';
import { getTexts } from '../settings/texts';
import type { AlertKind } from './service';

export type AlertState = 'open' | 'repeat' | 'resolved' | 'test';

export interface AlertMessage {
	kind: AlertKind | 'test';
	state: AlertState;
	detail: Record<string, unknown>;
}

export interface Notifier {
	send(message: AlertMessage): Promise<{ email: number; push: number }>;
}

const TITLE_KEY = {
	worker_down: 'alert.workerDown.title',
	no_orders: 'alert.noOrders.title',
	ifood_poll: 'alert.ifoodPoll.title',
	backup_stale: 'alert.backupStale.title',
	fiscal_errors: 'alert.fiscalErrors.title',
	disk: 'alert.disk.title',
	test: 'alert.test.title'
} as const;
const BODY_KEY = {
	worker_down: 'alert.workerDown.body',
	no_orders: 'alert.noOrders.body',
	ifood_poll: 'alert.ifoodPoll.body',
	backup_stale: 'alert.backupStale.body',
	fiscal_errors: 'alert.fiscalErrors.body',
	disk: 'alert.disk.body',
	test: 'alert.test.body'
} as const;

export { TITLE_KEY as ALERT_TITLE_KEY };

/** Title and body in the owner's wording. */
export async function alertText(message: AlertMessage, sql: Db = db()) {
	const texts = await getTexts(sql);
	const vars = Object.fromEntries(
		Object.entries(message.detail).map(([k, v]) => [k, String(v ?? '')])
	);
	const title = texts[TITLE_KEY[message.kind]];
	if (message.state === 'resolved') {
		return {
			title: fill(texts['alert.resolved.title'], { title }),
			body: texts['alert.resolved.body']
		};
	}
	return { title, body: fill(texts[BODY_KEY[message.kind]], vars) };
}

export const defaultNotifier: Notifier = {
	async send(message) {
		const sql = db();
		const [settings] = await sql<{ email_to: string[]; push_enabled: boolean }[]>`
			select email_to, push_enabled from alert_settings where id = 1`;
		const { title, body } = await alertText(message, sql);
		let email = 0;
		let push = 0;

		const { SMTP_URL, ALERT_FROM } = config();
		if (SMTP_URL && settings?.email_to.length) {
			const transport = nodemailer.createTransport(SMTP_URL);
			await transport.sendMail({
				from: ALERT_FROM ?? settings.email_to[0],
				to: settings.email_to,
				subject: title,
				text: body
			});
			email = settings.email_to.length;
		}

		if (settings?.push_enabled) {
			const keys = await vapidKeys(sql);
			const subs = keys
				? await sql<{ id: string; endpoint: string; p256dh: string; auth: string }[]>`
					select s.id, s.endpoint, s.p256dh, s.auth from staff_push_subscriptions s
					join staff_users u on u.id = s.staff_id
					where u.role = 'admin' and u.active`
				: [];
			const payload = JSON.stringify({ title, body, url: '/staff', tag: `alert-${message.kind}` });
			for (const s of subs) {
				try {
					await webpush.sendNotification(
						{ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
						payload,
						{
							TTL: 3600,
							urgency: 'high',
							vapidDetails: {
								subject: 'mailto:noreply@deku.local',
								publicKey: keys!.publicKey,
								privateKey: keys!.privateKey
							}
						}
					);
					push++;
				} catch (err) {
					const status = (err as { statusCode?: number }).statusCode;
					if (status === 404 || status === 410)
						await sql`delete from staff_push_subscriptions where id = ${s.id}`;
				}
			}
		}
		return { email, push };
	}
};
