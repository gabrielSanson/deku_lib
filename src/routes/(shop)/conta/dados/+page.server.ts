import { redirect } from '@sveltejs/kit';
import { requestAsCustomer } from '#lib/server/customers/privacy.ts';
import { db } from '#lib/server/db.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.customer) redirect(303, '/conta/entrar?next=/conta/dados');
	const open = await db()<{ kind: string; due_at: Date }[]>`
		select kind, due_at from privacy_requests where customer_id = ${locals.customer.id}
		and status = 'pending'`;
	const [s] = await db()<{ privacy_due_days: number }[]>`
		select privacy_due_days from store_runtime_settings where shop_id = current_shop_id()`;
	return { open, days: s?.privacy_due_days ?? 30 };
};

export const actions: Actions = {
	request: async ({ request, locals }) => {
		if (!locals.customer) redirect(303, '/conta/entrar?next=/conta/dados');
		const kind = (await request.formData()).get('kind') === 'delete' ? 'delete' : 'access';
		await requestAsCustomer(locals.customer.id, kind);
		return { requested: true };
	}
};
