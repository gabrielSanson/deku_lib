// Configurações → iFood: the connection (credentials, test, on/off) and its health.
import { attempt, failText, formString, shopText } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { ifoodActions } from '#lib/server/integrations/ifood/actions.ts';
import { ifoodStatus } from '#lib/server/integrations/ifood/settings.ts';
import { canStoreSecrets } from '#lib/server/secrets.ts';
import {
	currentIfoodAlerts,
	integrationHealth,
	replayChannelEvent,
	retryOutbound
} from '#lib/server/integrations/ifood/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const [ifood, connection, ifoodAlerts] = await Promise.all([
		integrationHealth(),
		ifoodStatus(),
		currentIfoodAlerts()
	]);
	return {
		ifood,
		connection,
		ifoodAlerts,
		canStoreSecrets: canStoreSecrets(),
		webhookUrl: new URL('/api/v1/integrations/ifood/webhook', event.url).toString()
	};
};

// iFood credentials, test and on/off live here too, not only in the setup wizard.
export const actions: Actions = {
	...ifoodActions,
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
