import { fail } from '@sveltejs/kit';
import { parseBRL } from '#lib/domain/money.ts';
import { attempt, formString } from '#lib/server/actions.ts';
import { platformDb } from '#lib/server/db.ts';
import { requirePlatformAdmin } from '#lib/server/platform/admins.ts';
import { getPlatformSettings, savePlatformSettings } from '#lib/server/platform/billing.ts';
import { setPlanPrice } from '#lib/server/platform/console.ts';
import { saveSupportWhatsapp, supportWhatsapp } from '#lib/server/platform/support.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePlatformAdmin(event);
	const plans = await platformDb()<{ code: string; name: string; price_cents: number }[]>`
		select code, name, price_cents from plans order by price_cents`;
	return { settings: await getPlatformSettings(), plans, support: await supportWhatsapp() };
};

const actor = (id: string) => ({ type: 'platform' as const, id });

export const actions: Actions = {
	pix: async (event) => {
		const admin = requirePlatformAdmin(event);
		const f = await event.request.formData();
		const graceDays = Number(formString(f, 'graceDays'));
		if (!Number.isInteger(graceDays) || graceDays < 0 || graceDays > 60)
			return fail(400, { error: 'Carência: de 0 a 60 dias.' });
		await savePlatformSettings(
			{
				pixKey: formString(f, 'pixKey') || null,
				pixMerchantName: formString(f, 'pixMerchantName') || null,
				pixMerchantCity: formString(f, 'pixMerchantCity') || null,
				graceDays
			},
			actor(admin.id)
		);
		return { done: 'Configurações salvas.' };
	},
	support: async (event) => {
		const admin = requirePlatformAdmin(event);
		const f = await event.request.formData();
		return attempt(async () => {
			await saveSupportWhatsapp(formString(f, 'whatsapp'), actor(admin.id));
			return { done: 'WhatsApp do suporte salvo.' };
		});
	},
	price: async (event) => {
		const admin = requirePlatformAdmin(event);
		const f = await event.request.formData();
		const cents = parseBRL(formString(f, 'price'));
		if (cents === null) return fail(400, { error: 'Preço inválido.' });
		return attempt(async () => {
			await setPlanPrice(formString(f, 'code'), cents, actor(admin.id));
			return { done: 'Preço salvo.' };
		});
	}
};
