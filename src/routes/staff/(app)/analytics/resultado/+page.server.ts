// Relatórios → Resultado do mês (DRE simplificado).
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { monthlyResult, saveSimplesRate, validMonth } from '#lib/server/expenses/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	return { result: await monthlyResult(validMonth(event.url.searchParams.get('mes'))) };
};

export const actions: Actions = {
	simples: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const v = formString(await event.request.formData(), 'rate').replace(',', '.');
		return attempt(async () => {
			await saveSimplesRate(Math.round(Number(v) * 100), staffActor(staff));
			return { saved: true };
		});
	}
};
