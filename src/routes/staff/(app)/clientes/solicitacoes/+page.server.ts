// Clientes → Solicitações: answer LGPD access and deletion requests.
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { answerRequest, listPrivacyRequests } from '#lib/server/customers/privacy.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	return { requests: await listPrivacyRequests() };
};

export const actions: Actions = {
	answer: async (event) => {
		const staff = requireStaff(event, ADMIN);
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
