import { fail } from '@sveltejs/kit';
import { attempt, formString } from '#lib/server/actions.ts';
import { MANAGERS, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { config } from '#lib/server/config.ts';
import { integrationHealth, replayChannelEvent, retryOutbound } from '#lib/server/integrations/ifood/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, MANAGERS);
	const c = config();
	return {
		ifood: await integrationHealth(),
		ifoodConfigured: Boolean(c.IFOOD_CLIENT_ID && c.IFOOD_CLIENT_SECRET && c.IFOOD_MERCHANT_ID),
		paymentProvider: c.PAYMENT_PROVIDER,
		directus: Boolean(c.DIRECTUS_URL),
		production: c.NODE_ENV === 'production'
	};
};

export const actions: Actions = {
	replay: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		const id = formString(await event.request.formData(), 'id');
		if (!id) return fail(400, { error: 'Evento inválido.' });
		return attempt(async () => {
			await replayChannelEvent(id, staffActor(staff));
			return { ok: 'Evento reenviado para processamento.' };
		});
	},
	retry: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		const id = formString(await event.request.formData(), 'id');
		if (!id) return fail(400, { error: 'Envio inválido.' });
		return attempt(async () => {
			await retryOutbound(id, staffActor(staff));
			return { ok: 'Nova tentativa agendada.' };
		});
	}
};
