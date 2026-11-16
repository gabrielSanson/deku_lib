// Campanhas → Mensagens: marketing to the contacts who accept offers.
import { fail } from '@sveltejs/kit';
import type { CustomerSource } from '#lib/domain/consent.ts';
import { parseBRL } from '#lib/domain/money.ts';
import { attempt, formString, shopText } from '#lib/server/actions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import {
	marketingAudience,
	recentSends,
	sendMarketing,
	setMarketingPrice,
	type MarketingChannel
} from '#lib/server/campaigns/messages.ts';
import type { CustomerFilter } from '#lib/server/customers/list.ts';
import type { Actions, PageServerLoad } from './$types';

const FILTERS: CustomerFilter[] = ['all', 'inactive', 'frequent', 'new'];
const SOURCES: CustomerSource[] = ['own', 'pos', 'whatsapp'];

function audienceFrom(get: (k: string) => string | null): {
	filter: CustomerFilter;
	source: CustomerSource | '';
} {
	return {
		filter: FILTERS.find((f) => f === get('filtro')) ?? 'all',
		source: SOURCES.find((s) => s === get('origem')) ?? ''
	};
}
const channelOf = (v: string | null): MarketingChannel => (v === 'whatsapp' ? 'whatsapp' : 'email');

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'settings.edit');
	const p = event.url.searchParams;
	const channel = channelOf(p.get('canal'));
	const audience = audienceFrom((k) => p.get(k));
	return {
		channel,
		audience,
		filters: FILTERS,
		sources: SOURCES,
		reach: await marketingAudience(channel, audience),
		sends: await recentSends()
	};
};

export const actions: Actions = {
	send: async (event) => {
		const staff = requirePermission(event, 'settings.edit');
		const d = await event.request.formData();
		if (d.get('confirm') !== 'on') return fail(400, { error: await shopText('marketing.confirm') });
		return attempt(async () => {
			const r = await sendMarketing(
				{
					channel: channelOf(formString(d, 'channel')),
					template: formString(d, 'template'),
					subject: formString(d, 'subject'),
					body: formString(d, 'body'),
					audience: audienceFrom((k) => formString(d, k) || null)
				},
				staffActor(staff),
				event.url.origin
			);
			return { ok: await shopText('marketing.sentOk', { count: r.recipients }) };
		});
	},
	price: async (event) => {
		requirePermission(event, 'settings.edit');
		const cents = parseBRL(formString(await event.request.formData(), 'price'));
		if (cents === null || cents < 0 || cents > 1000) return fail(400, { error: 'Valor inválido' });
		await setMarketingPrice(cents);
		return { ok: 'OK' };
	}
};
