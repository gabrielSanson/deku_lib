// First-run setup for the owner: shop details, menu, delivery, team, payments
// and (optionally) iFood. Every step can be revisited later; nothing here is
// required for the counter to work.
import { redirect } from '@sveltejs/kit';
import { attempt, failText, formString, shopText } from '#lib/server/actions.ts';
import { requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { importCatalog, menuIsEmpty } from '#lib/server/catalog/editor.ts';
import { config } from '#lib/server/config.ts';
import { db } from '#lib/server/db.ts';
import { ifoodActions } from '#lib/server/integrations/ifood/actions.ts';
import { ifoodStatus } from '#lib/server/integrations/ifood/settings.ts';
import { paymentProvider } from '#lib/server/payments/provider.ts';
import { canStoreSecrets } from '#lib/server/secrets.ts';
import {
	completeSetup,
	getStoreProfile,
	savePixSettings,
	saveStoreInfo
} from '#lib/server/settings/profile.ts';
import { getStoreSettings, updateStoreSettings } from '#lib/server/settings/service.ts';
import type { Actions, PageServerLoad } from './$types';
import { preset } from '#lib/server/presets/index.ts';

const OWNER = ['admin'] as const;
const STEPS = ['loja', 'cardapio', 'entrega', 'equipe', 'pagamentos', 'ifood', 'concluir'] as const;

export const load: PageServerLoad = async (event) => {
	requireStaff(event, [...OWNER]);
	const step = STEPS.includes(event.url.searchParams.get('passo') as never)
		? (event.url.searchParams.get('passo') as (typeof STEPS)[number])
		: 'loja';
	const sql = db();
	const [profile, settings, ifood, [counts]] = await Promise.all([
		getStoreProfile(sql, { fresh: true }),
		getStoreSettings(sql),
		ifoodStatus(),
		sql<{ products: number; categories: number; zones: number; staff: number }[]>`
			select
				(select count(*)::int from menu_products where active) as products,
				(select count(*)::int from menu_categories) as categories,
				(select count(*)::int from delivery_rules where enabled) as zones,
				(select count(*)::int from staff_users where active) as staff`
	]);
	const c = config();
	return {
		step,
		steps: STEPS,
		profile,
		settings,
		counts,
		onlineProvider: paymentProvider()?.name ?? null,
		ifood,
		canStoreSecrets: canStoreSecrets(),
		webhookUrl: new URL('/api/v1/integrations/ifood/webhook', event.url).toString(),
		production: c.NODE_ENV === 'production'
	};
};

const next = (step: string) => redirect(303, `/staff/setup?passo=${step}`);

export const actions: Actions = {
	store: async (event) => {
		const staff = requireStaff(event, [...OWNER]);
		const d = await event.request.formData();
		const r = await attempt(async () => {
			await saveStoreInfo(
				{
					displayName: formString(d, 'displayName'),
					phone: formString(d, 'phone'),
					addressLine: formString(d, 'addressLine'),
					city: formString(d, 'city')
				},
				staffActor(staff)
			);
			return { ok: true };
		});
		if (!('ok' in r)) return r;
		next('cardapio');
	},
	sampleMenu: async (event) => {
		const staff = requireStaff(event, [...OWNER]);
		if (!(await menuIsEmpty())) return failText(400, 'err.menu.notEmpty');
		await importCatalog(preset().catalog, staffActor(staff));
		return {
			ok: await shopText('ok.sampleMenuSetup')
		};
	},
	fulfillment: async (event) => {
		const staff = requireStaff(event, [...OWNER]);
		const d = await event.request.formData();
		const pickup = d.get('pickupEnabled') === 'on';
		const delivery = d.get('deliveryEnabled') === 'on';
		if (!pickup && !delivery) return failText(400, 'err.settings.channels');
		const r = await attempt(async () => {
			await updateStoreSettings(
				{ pickupEnabled: pickup, deliveryEnabled: delivery },
				staffActor(staff)
			);
			return { ok: true };
		});
		if (!('ok' in r)) return r;
		next('equipe');
	},
	payments: async (event) => {
		const staff = requireStaff(event, [...OWNER]);
		const d = await event.request.formData();
		const pixEnabled = d.get('pixEnabled') === 'on';
		const r = await attempt(async () => {
			await savePixSettings(
				{
					enabled: pixEnabled,
					key: formString(d, 'pixKey'),
					merchantName: formString(d, 'pixMerchantName'),
					merchantCity: formString(d, 'pixMerchantCity')
				},
				staffActor(staff)
			);
			return { ok: true };
		});
		if (!('ok' in r)) return r;
		if (!pixEnabled && !paymentProvider()) {
			return {
				warning:
					'Sem Pix, o site não tem como receber pagamento e não aceita pedidos. Os pedidos do balcão continuam funcionando.'
			};
		}
		next('ifood');
	},
	...ifoodActions,
	finish: async (event) => {
		const staff = requireStaff(event, [...OWNER]);
		const d = await event.request.formData();
		await completeSetup(staffActor(staff));
		if (d.get('open') === 'on') {
			await updateStoreSettings(
				{ acceptingOrders: true, webOrderingEnabled: true },
				staffActor(staff)
			);
		}
		redirect(303, '/staff');
	}
};
