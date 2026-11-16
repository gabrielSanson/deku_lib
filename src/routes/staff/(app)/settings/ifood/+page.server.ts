// Configurações → iFood: the connection (credentials, test, on/off) and its health.
import { attempt, failText, formString, shopText } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { ifoodActions } from '#lib/server/integrations/ifood/actions.ts';
import { ifoodStatus } from '#lib/server/integrations/ifood/settings.ts';
import { ifoodAppAvailable } from '#lib/server/integrations/ifood/auth.ts';
import { ifoodHomologationProgress } from '#lib/server/integrations/ifood/homologation.ts';
import { canStoreSecrets } from '#lib/server/secrets.ts';
import {
	currentIfoodAlerts,
	integrationHealth,
	replayChannelEvent,
	retryOutbound
} from '#lib/server/integrations/ifood/service.ts';
import { db } from '#lib/server/db.ts';
import { recentSyncReports, scheduleMenuSync } from '#lib/server/integrations/menu-sync.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const [ifood, connection, ifoodAlerts] = await Promise.all([
		integrationHealth(),
		ifoodStatus(),
		currentIfoodAlerts()
	]);
	return {
		syncReports: await recentSyncReports('ifood'),
		appAvailable: ifoodAppAvailable(),
		homologation: connection.homologation ? await ifoodHomologationProgress() : [],
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
	menuSync: async (event) => {
		requireStaff(event, ADMIN);
		await scheduleMenuSync(db(), { now: true });
		return { ok: await shopText('ok.menuSyncQueued') };
	},
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
