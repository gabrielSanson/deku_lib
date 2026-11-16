// Campanhas → Fidelidade: the loyalty card, referrals and birthday coupons.
import { fail } from '@sveltejs/kit';
import { isMilestoneTemplate, type CouponBenefit } from '#lib/domain/campaigns.ts';
import { parseBRL } from '#lib/domain/money.ts';
import { attempt, formString, shopText } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { milestoneSettings, saveMilestone } from '#lib/server/campaigns/milestones.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	return { programmes: await milestoneSettings() };
};

function benefitFrom(d: FormData, prefix: string): CouponBenefit {
	const type = formString(d, `${prefix}Type`);
	const value = formString(d, `${prefix}Value`);
	if (type === 'fixed') return { type: 'fixed', amountCents: parseBRL(value) ?? 0 };
	if (type === 'free_delivery') return { type: 'free_delivery' };
	return { type: 'percent', percent: Number(value) || 0, maxDiscountCents: null };
}

export const actions: Actions = {
	save: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const template = formString(d, 'template');
		if (!isMilestoneTemplate(template)) return fail(400, { error: 'Programa inválido' });
		const days = Number(formString(d, 'couponDays')) || 30;
		const params =
			template === 'loyalty_stamps'
				? { every: Number(formString(d, 'every')), benefit: benefitFrom(d, 'b'), couponDays: days }
				: template === 'referral'
					? { benefit: benefitFrom(d, 'b'), reward: benefitFrom(d, 'r'), couponDays: days }
					: { benefit: benefitFrom(d, 'b') };
		return attempt(async () => {
			await saveMilestone(
				template,
				{ active: d.get('active') === 'on', params },
				staffActor(staff)
			);
			return { ok: await shopText('loyalty.saved'), template };
		});
	}
};
