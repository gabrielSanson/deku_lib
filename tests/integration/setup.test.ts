// Menu editor, Pix with the shop's key, and the iFood connection set up in the app.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildPixCode } from '#lib/domain/pix.ts';
import {
	deleteCategory,
	saveCategory,
	saveGroup,
	saveProduct
} from '#lib/server/catalog/editor.ts';
import { getCatalog, getCatalogForPricing } from '#lib/server/catalog/service.ts';
import { getPage, savePage } from '#lib/server/catalog/pages.ts';
import { resetConfigForTests } from '#lib/server/config.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { DomainError } from '#lib/server/errors.ts';
import { IfoodApiError } from '#lib/server/integrations/ifood/api.ts';
import { checkIfoodConnection } from '#lib/server/integrations/ifood/check.ts';
import { ifoodAlerts } from '#lib/server/integrations/ifood/service.ts';
import {
	ifoodSettings,
	ifoodStatus,
	invalidateIfoodSettings,
	recordIfoodCheck,
	saveIfoodCredentials,
	setIfoodEnabled
} from '#lib/server/integrations/ifood/settings.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { getStoreProfile, savePixSettings } from '#lib/server/settings/profile.ts';
import { updateStoreSettings } from '#lib/server/settings/service.ts';
import { makeStaff } from './helpers.ts';

let owner: Awaited<ReturnType<typeof makeStaff>>;

beforeAll(async () => {
	owner = await makeStaff('admin');
});

afterAll(async () => {
	await db()`update ifood_settings set enabled = false, client_id = null, client_secret_enc = null,
		merchant_id = null, last_check_at = null, last_check_ok = null, last_check_error = null where id = 1`;
	await db()`update store_profile set pix_enabled = false, pix_key = null where id = 1`;
	await stopBoss();
	await closeDb();
});

describe('menu editor', () => {
	it('creates a category, an option group and a product the shop can sell', async () => {
		const category = await saveCategory({ name: 'Sobremesas Teste', position: 9 }, owner);
		expect(category).toBe('sobremesas-teste');
		const group = await saveGroup(
			{
				name: 'Cobertura',
				minSelections: 1,
				maxSelections: 1,
				options: [
					{ name: 'Chocolate', priceCents: 0 },
					{ name: 'Doce de leite', priceCents: 200 }
				]
			},
			owner
		);
		const sku = await saveProduct(
			{
				name: 'Sundae',
				description: 'Sorvete de baunilha.',
				categoryId: category,
				priceCents: 1290,
				prepStation: 'counter',
				channels: ['counter', 'web'],
				groupIds: [group]
			},
			owner
		);
		expect(sku).toBe('SUNDAE');

		const catalog = await getCatalog({ fresh: true });
		const product = catalog.products.find((p) => p.sku === 'SUNDAE');
		expect(product?.modifierGroups[0].options.map((o) => o.sku)).toEqual([
			'COBERT-CHOCOLATE',
			'COBERT-DOCE-DE-LEITE'
		]);

		const order = await createOrder({
			channel: 'counter',
			sourceMode: 'staff_pos',
			lines: [
				{ sku: 'SUNDAE', quantity: 2, options: [{ groupId: group, sku: 'COBERT-DOCE-DE-LEITE' }] }
			],
			fulfillmentType: 'counter',
			idempotencyKey: randomUUID(),
			initialStatus: 'confirmed',
			actor: owner
		});
		expect(order.totalCents).toBe(2 * (1290 + 200));
	});

	it('bumps the menu version on every change and reprices from the new price', async () => {
		const before = (await getCatalogForPricing()).version;
		await saveProduct(
			{
				name: 'Sundae',
				categoryId: 'sobremesas-teste',
				priceCents: 1390,
				prepStation: 'counter',
				channels: ['counter', 'web'],
				groupIds: []
			},
			owner,
			'SUNDAE'
		);
		const after = await getCatalogForPricing();
		expect(after.version).not.toBe(before);
		expect(after.products.find((p) => p.sku === 'SUNDAE')?.priceCents).toBe(1390);
	});

	it('hides inactive products and refuses to delete a category that still has products', async () => {
		await saveProduct(
			{
				name: 'Sundae',
				categoryId: 'sobremesas-teste',
				priceCents: 1390,
				prepStation: 'counter',
				channels: ['counter'],
				active: false
			},
			owner,
			'SUNDAE'
		);
		expect((await getCatalog({ fresh: true })).products.some((p) => p.sku === 'SUNDAE')).toBe(
			false
		);
		await expect(deleteCategory('sobremesas-teste', owner)).rejects.toBeInstanceOf(DomainError);
	});

	it('refuses an option code already used by a product', async () => {
		await expect(
			saveGroup(
				{
					name: 'Conflito',
					minSelections: 0,
					maxSelections: 1,
					options: [{ sku: 'BRG-CLASSICO', name: 'X', priceCents: 0 }]
				},
				owner
			)
		).rejects.toThrow(/já é usado/);
	});

	it('stores page text as plain blocks', async () => {
		await savePage(
			{
				slug: 'sobre',
				title: 'Quem somos',
				text: '## Desde 2020\n\nBurgers <b>na chapa</b>.',
				published: true
			},
			owner
		);
		const page = await getPage('sobre');
		expect(page?.blocks).toEqual([
			{ type: 'heading', text: 'Desde 2020' },
			{ type: 'paragraph', text: 'Burgers <b>na chapa</b>.' }
		]);
	});

	it('hides an unpublished page instead of serving its default', async () => {
		expect((await getPage('entrega'))?.title).toBe('Entrega, cancelamento e reembolso');
		await savePage(
			{ slug: 'entrega', title: 'Entrega', text: 'Só retirada.', published: false },
			owner
		);
		expect(await getPage('entrega')).toBeNull();
		await savePage(
			{ slug: 'entrega', title: 'Entrega', text: 'Só retirada.', published: true },
			owner
		);
		expect((await getPage('entrega'))?.title).toBe('Entrega');
	});
});

describe('Pix with the shop key', () => {
	it('validates and normalises the key', async () => {
		await expect(
			savePixSettings(
				{ enabled: true, key: '123', merchantName: 'Deku', merchantCity: 'SP' },
				owner
			)
		).rejects.toThrow(/Chave Pix inválida/);
		await savePixSettings(
			{
				enabled: true,
				key: '(11) 98765-4321',
				merchantName: 'Deku Burger Ltda Hamburgueria',
				merchantCity: 'São Paulo'
			},
			owner
		);
		const { pix } = await getStoreProfile(db(), { fresh: true });
		expect(pix).toEqual({
			enabled: true,
			key: '+5511987654321',
			merchantName: 'Deku Burger Ltda Hamburgu',
			merchantCity: 'Sao Paulo'
		});
		expect(
			buildPixCode({
				key: pix.key!,
				merchantName: pix.merchantName!,
				merchantCity: pix.merchantCity!,
				amountCents: 100,
				reference: 'PEDIDO1'
			})
		).toContain('+5511987654321');
	});

	it('creates web orders that wait for staff to confirm the Pix', async () => {
		await updateStoreSettings({ acceptingOrders: true, webOrderingEnabled: true }, owner);
		const order = await createOrder({
			channel: 'web',
			sourceMode: 'web',
			lines: [{ sku: 'ACP-FRITAS', quantity: 1 }],
			fulfillmentType: 'pickup',
			fulfillmentProvider: 'shop',
			customer: { name: 'Ana', phoneE164: '+5511987650000', email: null, marketingConsent: false },
			idempotencyKey: randomUUID(),
			paymentPlan: 'pix_key',
			actor: { type: 'customer', id: null }
		});
		const [row] = await db()<{ status: string; payment_status: string; payment_plan: string }[]>`
			select status, payment_status, payment_plan from orders where id = ${order.id}`;
		expect(row).toEqual({ status: 'new', payment_status: 'pending', payment_plan: 'pix_key' });
	});
});

describe('iFood connection from the setup wizard', () => {
	const creds = {
		clientId: 'app-client',
		clientSecret: 'app-secret-123',
		merchantId: 'merchant-0001'
	};

	it('stores the secret encrypted and prefers it over the environment', async () => {
		process.env.IFOOD_CLIENT_ID = 'env-client';
		resetConfigForTests();
		await saveIfoodCredentials(creds, owner);
		const [row] = await db()<
			{ client_secret_enc: string }[]
		>`select client_secret_enc from ifood_settings`;
		expect(row.client_secret_enc).not.toContain('app-secret');
		const s = await ifoodSettings({ fresh: true });
		expect(s).toMatchObject({
			source: 'app',
			clientId: 'app-client',
			clientSecret: 'app-secret-123'
		});
		expect(JSON.stringify(await ifoodStatus())).not.toContain('app-secret-123');
		delete process.env.IFOOD_CLIENT_ID;
		resetConfigForTests();
	});

	it('explains failures in plain words at the step that failed', async () => {
		const respond = (status: number) => async () => new Response('{}', { status });
		const base = { base: 'https://ifood.test', ...creds };
		const token = await checkIfoodConnection(base, respond(401) as typeof fetch);
		expect(token).toMatchObject({ ok: false, problem: { stage: 'token' } });
		if (!token.ok) expect(token.problem.title).toMatch(/recusou o Client ID/);

		let calls = 0;
		const tokenThenMissing = (async () =>
			++calls === 1
				? new Response(JSON.stringify({ accessToken: 't', expiresIn: 3600 }), { status: 200 })
				: new Response('not found', { status: 404 })) as typeof fetch;
		const merchant = await checkIfoodConnection(base, tokenThenMissing);
		expect(merchant).toMatchObject({ ok: false, problem: { stage: 'merchant' } });
		if (!merchant.ok) expect(merchant.problem.title).toMatch(/Merchant ID/);

		const offline = (async () => {
			throw new TypeError('fetch failed');
		}) as typeof fetch;
		const net = await checkIfoodConnection(base, offline);
		if (!net.ok) expect(net.problem.title).toMatch(/Não foi possível falar com o iFood/);
		expect(net.ok).toBe(false);
	});

	it('turns on only after a passing test, and new credentials turn it off again', async () => {
		await expect(setIfoodEnabled(true, owner)).rejects.toThrow(/Teste a conexão/);
		await recordIfoodCheck(true, null);
		await setIfoodEnabled(true, owner);
		expect((await ifoodSettings({ fresh: true })).enabled).toBe(true);
		await saveIfoodCredentials({ ...creds, clientSecret: 'rotated-secret' }, owner);
		invalidateIfoodSettings();
		expect((await ifoodSettings({ fresh: true })).enabled).toBe(false);
	});

	it('warns on the home screen when polling fails or goes quiet', () => {
		const now = new Date('2026-10-20T15:00:00Z');
		const base = {
			source: 'app' as const,
			enabled: true,
			clientId: 'x',
			merchantId: 'y',
			hasSecret: true,
			problem: null,
			lastCheckAt: null,
			lastCheckOk: true,
			lastCheckError: null,
			lastPollOkAt: new Date('2026-10-20T14:59:30Z'),
			lastPollErrorAt: null,
			lastPollError: null
		};
		const none = { failed: 0, dead: 0, outboundFailed: 0 };
		expect(ifoodAlerts(base, none, now)).toEqual([]);
		expect(ifoodAlerts({ ...base, enabled: false }, none, now)).toEqual([]);
		expect(
			ifoodAlerts(
				{
					...base,
					lastPollErrorAt: new Date('2026-10-20T14:59:50Z'),
					lastPollError: 'O iFood recusou o Client ID ou o Client Secret.'
				},
				none,
				now
			)[0]
		).toMatch(/não está respondendo: O iFood recusou/);
		expect(
			ifoodAlerts({ ...base, lastPollOkAt: new Date('2026-10-20T14:50:00Z') }, none, now)[0]
		).toMatch(/últimos 3 minutos/);
		expect(ifoodAlerts(base, { failed: 1, dead: 1, outboundFailed: 2 }, now)).toHaveLength(2);
	});

	it('keeps IfoodApiError details for the technical note', () => {
		expect(new IfoodApiError('x', 500, 'boom').body).toBe('boom');
	});
});
