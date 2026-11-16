// S1.4: the platform console's shop list and actions, and the signed read-only view link.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, platformDb } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import {
	extendTrial,
	listShops,
	readViewToken,
	setShopStatus,
	shopDetail,
	viewToken,
	VIEW_TTL_MS
} from '#lib/server/platform/console.ts';

const shopId = randomUUID();
const adminId = randomUUID();
const actor = { type: 'platform' as const, id: adminId };

beforeAll(async () => {
	await platformDb()`insert into shops (id, slug, name, status, trial_ends_at)
		values (${shopId}, ${`console-${shopId.slice(0, 6)}`}, 'Loja do console', 'trial', now() + interval '2 days')`;
	await platformDb()`select init_shop_rows(${shopId})`;
	await platformDb()`insert into shop_domains (shop_id, host, kind) values (${shopId}, ${`console-${shopId.slice(0, 6)}.plataforma.test`}, 'platform')`;
});

afterAll(async () => {
	await platformDb()`update shops set status = 'closed' where id = ${shopId}`;
	await stopBoss();
	await closeDb();
});

describe('platform console', () => {
	it('lists every shop with its address and activity', async () => {
		const row = (await listShops()).find((s) => s.id === shopId);
		expect(row).toMatchObject({ name: 'Loja do console', status: 'trial', orders7d: 0 });
		expect(row?.host).toContain('plataforma.test');
	});

	it('suspends and reactivates a shop, recording who did it', async () => {
		await setShopStatus(shopId, 'suspended', actor);
		expect((await shopDetail(shopId))?.shop.status).toBe('suspended');
		await setShopStatus(shopId, 'active', actor);
		const detail = await shopDetail(shopId);
		expect(detail?.shop.status).toBe('active');
		const actions = detail?.audit.filter((a) => a.actor_type === 'platform').map((a) => a.action);
		expect(actions).toEqual(expect.arrayContaining(['shop.suspended', 'shop.reactivated']));
	});

	it('extends a trial and brings a late shop back to trial', async () => {
		await platformDb()`update shops set status = 'past_due' where id = ${shopId}`;
		const before = (await shopDetail(shopId))!.shop.trial_ends_at!;
		await extendTrial(shopId, 10, actor);
		const after = (await shopDetail(shopId))!.shop;
		expect(after.status).toBe('trial');
		expect(after.trial_ends_at!.getTime() - before.getTime()).toBeGreaterThan(9 * 86_400_000);
		await expect(extendTrial(shopId, 0, actor)).rejects.toThrow();
		await expect(extendTrial(shopId, 91, actor)).rejects.toThrow();
	});

	it('signs a view link for one shop that expires after 30 minutes', () => {
		const now = Date.now();
		const token = viewToken(shopId, adminId, now);
		expect(readViewToken(token, shopId, now)).toBe(adminId);
		expect(readViewToken(token, randomUUID(), now)).toBeNull();
		expect(readViewToken(token, shopId, now + VIEW_TTL_MS + 1)).toBeNull();
		const forged = token.replace(adminId, randomUUID());
		expect(readViewToken(forged, shopId, now)).toBeNull();
		expect(readViewToken('garbage', shopId, now)).toBeNull();
	});
});
