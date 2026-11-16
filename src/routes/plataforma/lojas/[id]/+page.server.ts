import { error, redirect } from '@sveltejs/kit';
import { attempt, formString } from '#lib/server/actions.ts';
import { requirePlatformAdmin } from '#lib/server/platform/admins.ts';
import { invoicesOfShop, markInvoicePaid } from '#lib/server/platform/billing.ts';
import { extendTrial, setShopStatus, shopDetail, viewToken } from '#lib/server/platform/console.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePlatformAdmin(event);
	const detail = await shopDetail(event.params.id);
	if (!detail) error(404, 'Loja não encontrada.');
	return { ...detail, invoices: await invoicesOfShop(event.params.id) };
};

const actor = (id: string) => ({ type: 'platform' as const, id });

export const actions: Actions = {
	suspend: async (event) => {
		const admin = requirePlatformAdmin(event);
		return attempt(async () => {
			await setShopStatus(event.params.id, 'suspended', actor(admin.id));
			return { done: 'Loja suspensa.' };
		});
	},
	reactivate: async (event) => {
		const admin = requirePlatformAdmin(event);
		return attempt(async () => {
			await setShopStatus(event.params.id, 'active', actor(admin.id));
			return { done: 'Loja reativada.' };
		});
	},
	extend: async (event) => {
		const admin = requirePlatformAdmin(event);
		const days = Number(formString(await event.request.formData(), 'days'));
		return attempt(async () => {
			await extendTrial(event.params.id, days, actor(admin.id));
			return { done: `Teste estendido em ${days} dias.` };
		});
	},
	paid: async (event) => {
		const admin = requirePlatformAdmin(event);
		const invoiceId = formString(await event.request.formData(), 'invoiceId');
		const ok = await markInvoicePaid(invoiceId, actor(admin.id));
		return ok ? { done: 'Fatura marcada como paga.' } : { error: 'Fatura não está aberta.' };
	},
	view: async (event) => {
		const admin = requirePlatformAdmin(event);
		const detail = await shopDetail(event.params.id);
		const host =
			detail?.domains.find((d) => d.kind === 'custom' && d.verified_at)?.host ??
			detail?.domains[0]?.host;
		if (!host) error(404, 'A loja não tem endereço.');
		const t = viewToken(event.params.id, admin.id);
		redirect(303, `${event.url.protocol}//${host}/staff/ver-como?t=${encodeURIComponent(t)}`);
	}
};
