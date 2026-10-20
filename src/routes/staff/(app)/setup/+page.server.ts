// First-run setup for the owner: shop details, menu, delivery, team, payments
// and (optionally) iFood. Every step can be revisited later; nothing here is
// required for the counter to work.
import { fail, redirect } from '@sveltejs/kit';
import { attempt, formString } from '#lib/server/actions.ts';
import { requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { importCatalog, menuIsEmpty } from '#lib/server/catalog/editor.ts';
import { fixtureCatalog } from '#lib/server/catalog/fixture.ts';
import { config } from '#lib/server/config.ts';
import { db } from '#lib/server/db.ts';
import { checkIfoodConnection } from '#lib/server/integrations/ifood/check.ts';
import {
	ifoodSettings,
	ifoodStatus,
	invalidateIfoodSettings,
	recordIfoodCheck,
	saveIfoodCredentials,
	setIfoodEnabled
} from '#lib/server/integrations/ifood/settings.ts';
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

const OWNER = ['owner'] as const;
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
		if (!(await menuIsEmpty())) return fail(400, { error: 'O cardápio já tem produtos.' });
		await importCatalog(fixtureCatalog, staffActor(staff));
		return {
			ok: 'Cardápio de exemplo carregado. Troque nomes, preços e fotos em Editar cardápio.'
		};
	},
	fulfillment: async (event) => {
		const staff = requireStaff(event, [...OWNER]);
		const d = await event.request.formData();
		const pickup = d.get('pickupEnabled') === 'on';
		const delivery = d.get('deliveryEnabled') === 'on';
		if (!pickup && !delivery)
			return fail(400, { error: 'Escolha retirada, entrega ou as duas para os pedidos do site.' });
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
		const payOnFulfillment = d.get('payOnFulfillmentEnabled') === 'on';
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
			await updateStoreSettings({ payOnFulfillmentEnabled: payOnFulfillment }, staffActor(staff));
			return { ok: true };
		});
		if (!('ok' in r)) return r;
		if (!payOnFulfillment && !pixEnabled && !paymentProvider()) {
			return {
				warning:
					'Com as duas opções desligadas, o site não tem como receber pagamento. Os pedidos do balcão continuam funcionando.'
			};
		}
		next('ifood');
	},
	ifoodSave: async (event) => {
		const staff = requireStaff(event, [...OWNER]);
		const d = await event.request.formData();
		const r = await attempt(async () => {
			await saveIfoodCredentials(
				{
					clientId: formString(d, 'clientId'),
					clientSecret: formString(d, 'clientSecret'),
					merchantId: formString(d, 'merchantId')
				},
				staffActor(staff)
			);
			return { ok: true };
		});
		if (!('ok' in r)) return r;
		return runCheck();
	},
	ifoodTest: async (event) => {
		requireStaff(event, [...OWNER]);
		return runCheck();
	},
	ifoodEnable: async (event) => {
		const staff = requireStaff(event, [...OWNER]);
		const d = await event.request.formData();
		const enable = formString(d, 'enabled') === '1';
		if (enable && d.get('understood') !== 'on') {
			return fail(400, {
				error:
					'Marque que você entendeu que a integração ainda não foi homologada pelo iFood antes de ligar.'
			});
		}
		return attempt(async () => {
			await setIfoodEnabled(enable, staffActor(staff));
			return {
				ok: enable
					? 'iFood ligado. Os pedidos novos aparecem em Início e na cozinha. Acompanhe os primeiros pelo Gestor de Pedidos do iFood também.'
					: 'iFood desligado. Lance pedidos do iFood pelo Caixa em "iFood (manual)".'
			};
		});
	},
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

async function runCheck() {
	invalidateIfoodSettings();
	const s = await ifoodSettings({ fresh: true });
	if (s.problem) return fail(400, { error: s.problem });
	if (!s.clientId || !s.clientSecret || !s.merchantId) {
		return fail(400, { error: 'Preencha Client ID, Client Secret e Merchant ID e salve.' });
	}
	const result = await checkIfoodConnection({
		base: s.apiBase,
		clientId: s.clientId,
		clientSecret: s.clientSecret,
		merchantId: s.merchantId
	});
	if (result.ok) {
		await recordIfoodCheck(true, null);
		return { ok: 'Conexão com o iFood funcionando.' };
	}
	const { problem } = result;
	await recordIfoodCheck(false, `${problem.title} ${problem.action}`);
	return fail(400, { ifoodProblem: problem });
}
