// Sistema: is the shop's server looking after itself? Backups, open alerts and who gets them.
import { normalizeBrPhone } from '#lib/domain/phone.ts';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { attempt, failText, formString } from '#lib/server/actions.ts';
import {
	getAlertSettings,
	openAlerts,
	saveAlertSettings,
	saveStaffPushSubscription
} from '#lib/server/alerts/service.ts';
import { defaultNotifier } from '#lib/server/alerts/notify.ts';
import { ADMIN, requireStaff } from '#lib/server/auth/staff.ts';
import { config } from '#lib/server/config.ts';
import { pushPublicKey } from '#lib/server/notifications/push.ts';
import { backupStatus } from '#lib/server/settings/system.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const [backups, alerts, open, pushKey] = await Promise.all([
		backupStatus(),
		getAlertSettings(),
		openAlerts(),
		pushPublicKey().catch(() => null)
	]);
	return { backups, alerts, open, pushKey, smtp: Boolean(config().SMTP_URL) };
};

const email = z.string().email().max(120);
const subscription = z.object({
	endpoint: z.string().url().startsWith('https://').max(1000),
	p256dh: z.string().min(16).max(200),
	auth: z.string().min(8).max(100)
});

export const actions: Actions = {
	save: async (event) => {
		requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const emails = formString(d, 'emailTo')
			.split(/[,;\s]+/)
			.map((e) => e.trim())
			.filter(Boolean);
		const bad = emails.find((e) => !email.safeParse(e).success);
		if (bad) return failText(400, 'err.alerts.email', { vars: { email: bad } });
		const minutes = Number(formString(d, 'noOrdersMinutes'));
		if (!Number.isInteger(minutes) || minutes < 15 || minutes > 240)
			return failText(400, 'err.alerts.minutes');
		const phoneRaw = formString(d, 'ownerWhatsapp');
		const ownerWhatsapp = phoneRaw ? normalizeBrPhone(phoneRaw) : null;
		if (phoneRaw && !ownerWhatsapp) return failText(400, 'checkout.error.phone');
		return attempt(async () => {
			await saveAlertSettings({
				emailTo: [...new Set(emails)].slice(0, 10),
				pushEnabled: d.get('pushEnabled') === 'on',
				noOrdersEnabled: d.get('noOrdersEnabled') === 'on',
				noOrdersMinutes: minutes,
				dailySummaryEnabled: d.get('dailySummaryEnabled') === 'on',
				ownerWhatsapp
			});
			return { saved: true };
		});
	},
	subscribe: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const parsed = subscription.safeParse({
			endpoint: d.get('endpoint'),
			p256dh: d.get('p256dh'),
			auth: d.get('auth')
		});
		if (!parsed.success) return failText(400, 'err.alerts.push');
		await saveStaffPushSubscription(staff.id, parsed.data);
		return { subscribed: true };
	},
	test: async (event) => {
		requireStaff(event, ADMIN);
		try {
			const sent = await defaultNotifier.send({ kind: 'test', state: 'test', detail: {} });
			return { tested: sent };
		} catch (err) {
			return fail(502, { testError: String((err as Error).message ?? err) });
		}
	}
};
