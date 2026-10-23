import { attempt, failText, formString, shopText } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { config } from '#lib/server/config.ts';
import { getStoreProfile } from '#lib/server/settings/profile.ts';
import {
	currentIfoodAlerts,
	integrationHealth,
	replayChannelEvent,
	retryOutbound
} from '#lib/server/integrations/ifood/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const c = config();
	const [ifood, profile] = await Promise.all([integrationHealth(), getStoreProfile()]);
	return {
		ifood,
		ifoodAlerts: await currentIfoodAlerts(),
		shopPix: profile.pix.enabled,
		paymentProvider: c.PAYMENT_PROVIDER,
		webhookSecretSet: !!c.MERCADOPAGO_WEBHOOK_SECRET,
		production: c.NODE_ENV === 'production'
	};
};

export const actions: Actions = {
	replay: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const id = formString(await event.request.formData(), 'id');
		if (!id) return failText(400, 'err.integrations.event');
		return attempt(async () => {
			await replayChannelEvent(id, staffActor(staff));
			return { ok: await shopText('ok.eventRetried') };
		});
	},
	retry: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const id = formString(await event.request.formData(), 'id');
		if (!id) return failText(400, 'err.integrations.delivery');
		return attempt(async () => {
			await retryOutbound(id, staffActor(staff));
			return { ok: await shopText('ok.deliveryRetried') };
		});
	}
};
