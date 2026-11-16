// Self sign-up: the owner creates a shop and goes straight to its setup wizard.
import { redirect } from '@sveltejs/kit';
import { failText, formString } from '#lib/server/actions.ts';
import { BUSINESS_TYPES, type BusinessType } from '#lib/domain/signup.ts';
import { DomainError } from '#lib/server/errors.ts';
import { createShop } from '#lib/server/platform/signup.ts';
import { BUSINESS_TYPE_STARTS } from '#lib/server/presets/business-types.ts';
import { clientKey, rateLimit } from '#lib/server/rate-limit.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { platformDomain } = await parent();
	return {
		platformDomain,
		businessTypes: BUSINESS_TYPES.map((t) => ({ value: t, label: BUSINESS_TYPE_STARTS[t].label }))
	};
};

export const actions: Actions = {
	default: async (event) => {
		const d = await event.request.formData();
		const keep = {
			ownerName: formString(d, 'ownerName'),
			email: formString(d, 'email'),
			shopName: formString(d, 'shopName'),
			slug: formString(d, 'slug').toLowerCase(),
			businessType: formString(d, 'businessType'),
			city: formString(d, 'city')
		};
		// Bots fill every field, people never see this one.
		if (formString(d, 'website')) return failText(400, 'err.signup.failed', { data: keep });
		if (!rateLimit(`signup:${clientKey(event)}`, 5, 60 * 60_000)) {
			return failText(429, 'err.signup.tooMany', { data: keep });
		}
		let created;
		try {
			created = await createShop({
				...keep,
				businessType: keep.businessType as BusinessType,
				password: String(d.get('password') ?? ''),
				acceptTerms: d.get('acceptTerms') === 'on',
				ip: clientKey(event)
			});
		} catch (err) {
			if (err instanceof DomainError && err.key) {
				return failText(err.status === 500 ? 400 : err.status, err.key, {
					data: keep,
					vars: err.vars
				});
			}
			throw err;
		}
		const next = encodeURIComponent('/staff/setup');
		redirect(303, `${event.url.protocol}//${created.host}/staff/login?next=${next}&novo=1`);
	}
};
