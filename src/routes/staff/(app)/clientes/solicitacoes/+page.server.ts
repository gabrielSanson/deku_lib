// Clientes → Solicitações: answer LGPD access and deletion requests.
import { attempt, formString } from '#lib/server/actions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { answerRequest, listPrivacyRequests } from '#lib/server/customers/privacy.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'customers.view');
	return { requests: await listPrivacyRequests() };
};

export const actions: Actions = {
	answer: async (event) => {
		const staff = requirePermission(event, 'customers.view');
		const d = await event.request.formData();
		const outcome = formString(d, 'outcome') === 'refused' ? 'refused' : 'done';
		return attempt(async () => {
			await answerRequest(
				formString(d, 'id'),
				outcome,
				staffActor(staff),
				formString(d, 'note') || null
			);
			return { ok: true };
		});
	}
};
