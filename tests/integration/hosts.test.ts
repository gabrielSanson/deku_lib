// S1.2: each request finds its shop by host name; webhooks name their shop in the path.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resetConfigForTests } from '#lib/server/config.ts';
import { closeDb, currentShopId, platformDb, withShop } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { getShop, invalidateShopCache, resolveShop } from '#lib/server/platform/shops.ts';
import { forShopInPath } from '#lib/server/platform/webhooks.ts';
import { GET as tlsAsk } from '../../src/routes/api/v1/tls-ask/+server';
import { OTHER_SHOP_ID } from './setup';

beforeAll(async () => {
	process.env.TENANCY = 'multi';
	process.env.PLATFORM_DOMAIN = 'plataforma.test';
	resetConfigForTests();
	invalidateShopCache();
	await platformDb()`insert into shop_domains (host, shop_id, kind)
		values ('outra.plataforma.test', ${OTHER_SHOP_ID}, 'platform'),
			('pedidos.outra.com.br', ${OTHER_SHOP_ID}, 'custom')
		on conflict do nothing`;
});

afterAll(async () => {
	await platformDb()`update shops set status = 'active' where id = ${OTHER_SHOP_ID}`;
	delete process.env.TENANCY;
	delete process.env.PLATFORM_DOMAIN;
	resetConfigForTests();
	invalidateShopCache();
	await stopBoss();
	await closeDb();
});

const ask = async (domain: string) =>
	(await tlsAsk({ url: new URL(`http://x/api/v1/tls-ask?domain=${domain}`) } as never)).status;

describe('finding the shop', () => {
	it('by its platform host, whatever the case or port', async () => {
		expect((await resolveShop('Outra.Plataforma.test:443'))?.id).toBe(OTHER_SHOP_ID);
		expect(await resolveShop('ninguem.plataforma.test')).toBeNull();
	});

	it('by a custom domain only once it is verified', async () => {
		expect(await resolveShop('pedidos.outra.com.br')).toBeNull();
		await platformDb()`update shop_domains set verified_at = now() where host = 'pedidos.outra.com.br'`;
		invalidateShopCache();
		expect((await resolveShop('pedidos.outra.com.br'))?.id).toBe(OTHER_SHOP_ID);
	});

	it('lets Caddy get certificates only for shop hosts and the platform', async () => {
		expect(await ask('outra.plataforma.test')).toBe(200);
		expect(await ask('plataforma.test')).toBe(200);
		expect(await ask('evil.example.com')).toBe(404);
	});

	it('runs a webhook for the shop in its path, and 404s an unknown one', async () => {
		const ok = await forShopInPath(OTHER_SHOP_ID, async () => new Response(currentShopId()));
		expect(await ok.text()).toBe(OTHER_SHOP_ID);
		expect((await forShopInPath(randomUUID(), async () => new Response('x'))).status).toBe(404);
		expect((await forShopInPath('not-a-shop', async () => new Response('x'))).status).toBe(404);
	});

	it('refuses site orders while the shop is suspended', async () => {
		await platformDb()`update shops set status = 'suspended' where id = ${OTHER_SHOP_ID}`;
		await getShop(OTHER_SHOP_ID);
		await expect(
			withShop(OTHER_SHOP_ID, () =>
				createOrder({
					channel: 'web',
					sourceMode: 'web',
					lines: [{ sku: 'BRG-CLASSICO', quantity: 1, options: [] }],
					fulfillmentType: 'pickup',
					idempotencyKey: randomUUID(),
					customer: { name: 'Ana', phoneE164: '+5511999990000' },
					actor: { type: 'customer', id: null }
				})
			)
		).rejects.toMatchObject({ code: 'suspended' });
	});
});
