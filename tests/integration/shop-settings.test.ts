// S1.1: settings that were .env values are per shop.
import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, platformDb, withShop } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import {
	paymentProvider,
	paymentSettings,
	savePaymentSettings
} from '#lib/server/payments/provider.ts';
import { getShop } from '#lib/server/platform/shops.ts';
import { getShopSecret } from '#lib/server/platform/secrets.ts';
import { presetId } from '#lib/server/presets/index.ts';
import { getStoreProfile } from '#lib/server/settings/profile.ts';
import { OTHER_SHOP_ID } from './setup';
import { makeStaff } from './helpers';

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

describe('settings per shop', () => {
	it('the default shop follows .env until it saves its own payment choice; others start with none', async () => {
		expect((await paymentSettings()).source).not.toBe('shop');
		const other = await withShop(OTHER_SHOP_ID, () => paymentSettings());
		expect(other).toMatchObject({ provider: 'none', source: 'none' });
	});

	it("keeps a shop's Mercado Pago keys encrypted and to itself", async () => {
		const admin = await makeStaff('admin');
		await withShop(OTHER_SHOP_ID, () =>
			savePaymentSettings(
				{
					provider: 'mercadopago',
					methods: ['pix'],
					accessToken: 'APP_USR-123',
					webhookSecret: 'whsec'
				},
				admin
			)
		);
		const [row] = await platformDb()<{ ciphertext: string }[]>`
			select ciphertext from shop_secrets where shop_id = ${OTHER_SHOP_ID} and kind = 'mercadopago_token'`;
		expect(row.ciphertext).not.toContain('APP_USR');
		expect(await getShopSecret('mercadopago_token', OTHER_SHOP_ID)).toBe('APP_USR-123');
		const p = await withShop(OTHER_SHOP_ID, () => paymentProvider());
		expect(p?.name).toBe('mercadopago');
		expect(p?.methods).toEqual(['pix']);
		// The default shop is unaffected.
		expect((await paymentSettings()).accessToken ?? null).not.toBe('APP_USR-123');
		await expect(
			withShop(OTHER_SHOP_ID, () =>
				savePaymentSettings({ provider: 'mercadopago', methods: [] }, admin)
			)
		).rejects.toMatchObject({ key: 'err.payments.noMethod' });
	});

	it("uses each shop's sign-up name and look until the owner changes them", async () => {
		await platformDb()`update shops set preset = 'deku', name = 'Outra Hamburgueria' where id = ${OTHER_SHOP_ID}`;
		await getShop(OTHER_SHOP_ID);
		const [look, profile] = await withShop(OTHER_SHOP_ID, async () => [
			presetId(),
			await getStoreProfile(undefined, { fresh: true })
		]);
		expect(look).toBe('deku');
		expect((profile as { displayName: string }).displayName).toBe('Outra Hamburgueria');
	});
});
