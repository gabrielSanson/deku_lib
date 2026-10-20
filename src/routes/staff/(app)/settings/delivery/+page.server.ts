import { fail } from '@sveltejs/kit';
import { parseBRL } from '#lib/domain/money.ts';
import { matchDeliveryRule } from '#lib/domain/pricing.ts';
import { attempt, formString } from '#lib/server/actions.ts';
import { MANAGERS, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import {
	deleteDeliveryRule,
	listDeliveryRules,
	saveDeliveryRule
} from '#lib/server/settings/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, MANAGERS);
	const rules = await listDeliveryRules();
	const cep = event.url.searchParams.get('cep') ?? '';
	const hood = event.url.searchParams.get('bairro') ?? '';
	const preview =
		cep || hood ? { cep, hood, rule: matchDeliveryRule(rules, { cep, neighborhood: hood }) } : null;
	return { rules, preview };
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		const d = await event.request.formData();
		const kind = formString(d, 'matchKind');
		if (kind !== 'cep_prefix' && kind !== 'neighborhood')
			return fail(400, { error: 'Tipo inválido.' });
		const fee = parseBRL(formString(d, 'fee'));
		const min = parseBRL(formString(d, 'minOrder') || '0');
		const value = formString(d, 'matchValue');
		if (fee === null || min === null || !value || !formString(d, 'name')) {
			return fail(400, { error: 'Preencha nome, área e taxa.' });
		}
		return attempt(async () => {
			await saveDeliveryRule(
				{
					id: formString(d, 'id') || undefined,
					name: formString(d, 'name'),
					matchKind: kind,
					matchValue: kind === 'cep_prefix' ? value.replace(/\D/g, '') : value,
					feeCents: fee,
					minOrderCents: min,
					enabled: d.get('enabled') === 'on',
					priority: Number(formString(d, 'priority') || 100)
				},
				staffActor(staff)
			);
			return { ok: true };
		});
	},
	delete: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		await deleteDeliveryRule(formString(await event.request.formData(), 'id'), staffActor(staff));
		return { ok: true };
	}
};
