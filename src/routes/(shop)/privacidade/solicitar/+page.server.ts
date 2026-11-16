// Public "Meus dados" form: no account needed, confirmed by a code sent to the e-mail.
import { fail } from '@sveltejs/kit';
import { attempt, formString } from '#lib/server/actions.ts';
import { confirmByEmail, requestByEmail } from '#lib/server/customers/privacy.ts';
import { clientKey, rateLimit } from '#lib/server/rate-limit.ts';
import { getTexts } from '#lib/server/settings/texts.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	start: async (event) => {
		const texts = await getTexts();
		if (!rateLimit(`privacy:${clientKey(event)}`, 5, 60 * 60_000))
			return fail(429, { error: texts['checkout.error.tooMany'] });
		const d = await event.request.formData();
		const kind = d.get('kind') === 'delete' ? 'delete' : 'access';
		return attempt(async () => {
			const r = await requestByEmail(formString(d, 'email'), kind);
			return { requestId: r.id };
		});
	},
	confirm: async (event) => {
		const texts = await getTexts();
		if (!rateLimit(`privacy-code:${clientKey(event)}`, 10, 60 * 60_000))
			return fail(429, { error: texts['checkout.error.tooMany'] });
		const d = await event.request.formData();
		const id = formString(d, 'requestId');
		if (!/^[0-9a-f-]{36}$/.test(id)) return fail(400, { error: texts['err.privacy.code'] });
		return attempt(async () => {
			await confirmByEmail(id, formString(d, 'code'));
			return { confirmed: true };
		});
	}
};
