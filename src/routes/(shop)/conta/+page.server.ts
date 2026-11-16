import { fail, redirect } from '@sveltejs/kit';
import { phoneFromInput, profileInput } from '#lib/domain/account.ts';
import { formString } from '#lib/server/actions.ts';
import { customerOrders, updateCustomerProfile } from '#lib/server/auth/customer.ts';
import { DomainError } from '#lib/server/errors.ts';
import { customerRewards, setBirthday } from '#lib/server/campaigns/milestones.ts';
import { db } from '#lib/server/db.ts';
import { getTexts } from '#lib/server/settings/texts.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.customer) redirect(303, '/conta/entrar?next=/conta');
	const [b] = await db()<{ birthday: string | null }[]>`
		select to_char(birthday, 'YYYY-MM-DD') as birthday from customers where id = ${locals.customer.id}`;
	const rewards = await customerRewards(locals.customer.id);
	return {
		customer: locals.customer,
		birthday: b?.birthday ?? '',
		rewards,
		referralLink: rewards.referralCode ? `${url.origin}/?ref=${rewards.referralCode}` : null,
		orders: await customerOrders(locals.customer.id)
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const texts = await getTexts();
		if (!locals.customer) redirect(303, '/conta/entrar?next=/conta');
		const form = await request.formData();
		const parsed = profileInput.safeParse({
			name: formString(form, 'name'),
			phone: formString(form, 'phone')
		});
		const phone = parsed.success ? phoneFromInput(parsed.data.phone) : { ok: false as const };
		if (!parsed.success || !phone.ok) return fail(400, { error: texts['account.error.invalid'] });
		const birthday = formString(form, 'birthday');
		if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday))
			return fail(400, { error: texts['err.birthday'] });
		try {
			await updateCustomerProfile(locals.customer.id, {
				name: parsed.data.name,
				phoneE164: phone.phoneE164
			});
			await setBirthday(locals.customer.id, birthday || null);
		} catch (err) {
			if (err instanceof DomainError && err.code === 'phone_taken')
				return fail(409, { error: texts['account.error.phoneTaken'] });
			throw err;
		}
		return { saved: true };
	},

	logout: async ({ locals }) => {
		await locals.supabase?.auth.signOut();
		redirect(303, '/');
	}
};
