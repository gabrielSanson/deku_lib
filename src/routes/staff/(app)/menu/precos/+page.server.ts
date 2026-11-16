import { fail } from '@sveltejs/kit';
import { parseBRL } from '#lib/domain/money.ts';
import { attempt, formString, shopText } from '#lib/server/actions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import {
	listIfoodPrices,
	saveChannelSettings,
	saveIfoodPrices
} from '#lib/server/catalog/channel-prices.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'menu.edit');
	return await listIfoodPrices();
};

export const actions: Actions = {
	markup: async (event) => {
		const staff = requirePermission(event, 'menu.edit');
		const f = await event.request.formData();
		const pct = Number(formString(f, 'markup').replace(',', '.') || '0');
		const round = formString(f, 'roundTo');
		return attempt(async () => {
			await saveChannelSettings(
				{
					markupBps: Number.isFinite(pct) ? Math.round(pct * 100) : -1,
					roundTo: round === '' ? null : Number(round)
				},
				staffActor(staff)
			);
			return { ok: await shopText('ok.pricesSaved') };
		});
	},
	prices: async (event) => {
		const staff = requirePermission(event, 'menu.edit');
		const f = await event.request.formData();
		const entries: { sku: string; priceCents: number | null }[] = [];
		for (const [key, value] of f.entries()) {
			if (!key.startsWith('ifood:') || typeof value !== 'string') continue;
			const text = value.trim();
			const cents = text ? parseBRL(text) : null;
			if (text && cents === null) return fail(400, { error: await shopText('err.prices.bad') });
			entries.push({ sku: key.slice(6), priceCents: cents });
		}
		return attempt(async () => {
			await saveIfoodPrices(entries, staffActor(staff));
			return { ok: await shopText('ok.pricesSaved') };
		});
	}
};
