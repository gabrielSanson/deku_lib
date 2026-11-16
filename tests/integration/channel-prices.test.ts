// S2.3: prices per channel, the iFood menu sync and availability, and reading iFood's menu back.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseMenuCsv } from '#lib/domain/menu-csv.ts';
import { applyMarkup, priceCart } from '#lib/domain/pricing.ts';
import {
	getChannelSettings,
	saveChannelSettings,
	saveIfoodPrices
} from '#lib/server/catalog/channel-prices.ts';
import { getCatalog } from '#lib/server/catalog/service.ts';
import { resetConfigForTests } from '#lib/server/config.ts';
import { closeDb, db, platformDb } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { ifoodAdapter } from '#lib/server/integrations/ifood/adapter.ts';
import type { IfoodClient } from '#lib/server/integrations/ifood/api.ts';
import { readIfoodMenuAsCsv } from '#lib/server/integrations/ifood/catalog.ts';
import { invalidateIfoodSettings } from '#lib/server/integrations/ifood/settings.ts';
import { runAvailability, runMenuSync } from '#lib/server/integrations/menu-sync.ts';
import { setSoldOut } from '#lib/server/settings/service.ts';

const actor = { type: 'system' as const, id: null };

function fakeCatalogClient(failSku?: string, answer: unknown = null) {
	const calls: { method: string; path: string; body: unknown }[] = [];
	const client = {
		async request(method: string, path: string, body?: unknown) {
			calls.push({ method, path, body });
			const sku = (body as { item?: { externalCode?: string } })?.item?.externalCode;
			if (failSku && sku === failSku) throw new Error('iFood recusou o item');
			return answer;
		}
	} as unknown as IfoodClient;
	return { client, calls };
}

beforeAll(() => {
	process.env.IFOOD_ENABLED = 'true';
	process.env.IFOOD_CLIENT_ID = 'test-client';
	process.env.IFOOD_CLIENT_SECRET = 'test-secret';
	process.env.IFOOD_MERCHANT_ID = 'merchant-test';
	resetConfigForTests();
	invalidateIfoodSettings();
});

afterAll(async () => {
	await saveChannelSettings({ markupBps: 0, roundTo: 90 }, actor);
	await db()`delete from menu_channel_prices`;
	delete process.env.IFOOD_ENABLED;
	resetConfigForTests();
	await stopBoss();
	await closeDb();
});

describe('prices per channel', () => {
	it('applies the iFood markup to iFood prices only, and an own price wins', async () => {
		await saveChannelSettings({ markupBps: 1500, roundTo: 90 }, actor);
		expect(await getChannelSettings()).toEqual({ markupBps: 1500, roundTo: 90 });
		let catalog = await getCatalog({ fresh: true });
		const p = catalog.products.find(
			(x) => x.channels.includes('ifood') && x.modifierGroups.every((g) => g.minSelections === 0)
		)!;
		const lines = [{ sku: p.sku, quantity: 1, options: [] }];
		const ifood = priceCart(catalog, lines, { channel: 'ifood', soldOut: new Set() });
		expect(ifood.lines[0].unitPriceCents).toBe(applyMarkup(p.priceCents, 1500, 90));
		const web = priceCart(catalog, lines, { channel: 'web', soldOut: new Set() });
		expect(web.lines[0].unitPriceCents).toBe(p.priceCents);

		await saveIfoodPrices([{ sku: p.sku, priceCents: 9990 }], actor);
		catalog = await getCatalog({ fresh: true });
		expect(
			priceCart(catalog, lines, { channel: 'ifood', soldOut: new Set() }).lines[0].unitPriceCents
		).toBe(9990);
		await saveIfoodPrices([{ sku: p.sku, priceCents: null }], actor);
	});

	it('queues an iFood menu sync after a price change', async () => {
		const [job] = await platformDb()<{ n: number }[]>`
			select count(*)::int as n from pgboss.job where name = 'ifood-menu-sync'`;
		expect(job.n).toBeGreaterThan(0);
	});
});

describe('iFood menu sync', () => {
	it('sends every iFood item with its iFood price and reports created, updated and failed', async () => {
		const catalog = await getCatalog({ fresh: true });
		const items = catalog.products.filter((p) => p.channels.includes('ifood'));
		const failing = items[0].sku;
		const first = fakeCatalogClient(failing);
		const r1 = await runMenuSync(ifoodAdapter(first.client));
		expect(r1?.created).toBe(items.length - 1);
		expect(r1?.failed.map((f) => f.sku)).toEqual([failing]);
		const sent = first.calls.find(
			(c) => (c.body as { item: { externalCode: string } }).item.externalCode === items[1].sku
		);
		expect((sent?.body as { item: { price: { value: number } } }).item.price.value).toBe(
			applyMarkup(items[1].priceCents, 1500, 90) / 100
		);

		const second = fakeCatalogClient();
		const r2 = await runMenuSync(ifoodAdapter(second.client));
		expect(r2).toMatchObject({ created: 1, updated: items.length - 1, failed: [] });
		const [report] = await db()<{ created: number; updated: number }[]>`
			select created, updated from channel_sync_reports where channel = 'ifood' and kind = 'menu'
			order by started_at desc limit 1`;
		expect(report).toEqual({ created: 1, updated: items.length - 1 });
	});

	it('takes a sold-out item off iFood right away', async () => {
		const catalog = await getCatalog({ fresh: true });
		const sku = catalog.products.find((p) => p.channels.includes('ifood'))!.sku;
		await setSoldOut(sku, true, actor);
		const [job] = await platformDb()<{ data: { skus: string[]; available: boolean } }[]>`
			select data from pgboss.job where name = 'channel-availability' order by created_on desc limit 1`;
		expect(job.data).toMatchObject({ skus: [sku], available: false });
		const { client, calls } = fakeCatalogClient();
		expect(await runAvailability(ifoodAdapter(client), job.data)).toBe('sent');
		expect(calls[0]).toMatchObject({
			method: 'PATCH',
			body: [{ externalCode: sku, status: 'UNAVAILABLE' }]
		});
		await setSoldOut(sku, false, actor);
	});

	it('reads the iFood menu back into the spreadsheet preview', async () => {
		const { client } = fakeCatalogClient(undefined, [
			{
				name: 'Lanches',
				items: [
					{
						name: 'X-Tudo',
						description: 'Completo; com ovo',
						price: { value: 32.5 },
						optionGroups: [{ options: [{ name: 'Bacon', price: { value: 4 } }] }]
					}
				]
			}
		]);
		const parsed = parseMenuCsv(await readIfoodMenuAsCsv(client));
		expect(parsed.catalog?.products[0]).toMatchObject({
			name: 'X-Tudo',
			description: 'Completo; com ovo',
			priceCents: 3250
		});
		expect(parsed.catalog?.products[0].modifierGroups[0].options[0]).toMatchObject({
			name: 'Bacon',
			priceCents: 400
		});
	});
});
