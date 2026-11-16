// Gestão → Despesas: the month's bills and the fixed ones entered every month.
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { parseBRL } from '#lib/domain/money.ts';
import {
	addExpense,
	addRecurring,
	categories,
	deleteExpense,
	listExpenses,
	listRecurring,
	setRecurringActive,
	validMonth
} from '#lib/server/expenses/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const month = validMonth(event.url.searchParams.get('mes'));
	return {
		month,
		categories: await categories(),
		expenses: await listExpenses(month),
		recurring: await listRecurring()
	};
};

export const actions: Actions = {
	add: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		return attempt(async () => {
			await addExpense(
				{
					categoryId: formString(d, 'categoryId'),
					description: formString(d, 'description'),
					amountCents: parseBRL(formString(d, 'amount')) ?? 0,
					month: validMonth(formString(d, 'month')),
					paidAt: formString(d, 'paidAt') || null
				},
				staffActor(staff)
			);
			return { saved: true };
		});
	},
	delete: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const id = formString(await event.request.formData(), 'id');
		return attempt(async () => {
			await deleteExpense(id, staffActor(staff));
			return { saved: true };
		});
	},
	recurring: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		return attempt(async () => {
			await addRecurring(
				{
					categoryId: formString(d, 'categoryId'),
					description: formString(d, 'description'),
					amountCents: parseBRL(formString(d, 'amount')) ?? 0,
					dayOfMonth: Number(formString(d, 'day'))
				},
				staffActor(staff)
			);
			return { saved: true };
		});
	},
	toggle: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		return attempt(async () => {
			await setRecurringActive(formString(d, 'id'), d.get('active') === 'true', staffActor(staff));
			return { saved: true };
		});
	}
};
