// Relatórios → Resultado do mês (DRE simplificado).
import { attempt, formString } from '#lib/server/actions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { monthlyResult, saveSimplesRate, validMonth } from '#lib/server/expenses/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'reports.view');
	return { result: await monthlyResult(validMonth(event.url.searchParams.get('mes'))) };
};

export const actions: Actions = {
	simples: async (event) => {
		const staff = requirePermission(event, 'reports.view');
		const v = formString(await event.request.formData(), 'rate').replace(',', '.');
		return attempt(async () => {
			await saveSimplesRate(Math.round(Number(v) * 100), staffActor(staff));
			return { saved: true };
		});
	}
};
