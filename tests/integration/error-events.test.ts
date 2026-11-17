// S5.11: errors are grouped by fingerprint with a count, kept per shop, and a shop's own database
// role only sees its rows.
import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, db, platformDb, withShop } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import {
	clearErrorGroup,
	fingerprint,
	listErrorGroups,
	recordError
} from '#lib/server/monitoring/errors.ts';
import { OTHER_SHOP_ID } from './setup.ts';

afterAll(async () => {
	await platformDb()`delete from error_events`;
	await stopBoss();
	await closeDb();
});

describe('error tracking', () => {
	it('groups the same problem whatever the ids in it', () => {
		const a = fingerprint({ where: 'web', message: 'Order 123 not found', route: '/x/1' });
		const b = fingerprint({ where: 'web', message: 'Order 987 not found', route: '/x/2' });
		const c = fingerprint({ where: 'worker', message: 'Order 123 not found', route: '/x/1' });
		expect(a).toBe(b);
		expect(a).not.toBe(c);
	});

	it('counts repeats and keeps shops apart', async () => {
		await recordError({ where: 'web', message: 'Boom 1', route: '/staff/orders' });
		await recordError({ where: 'web', message: 'Boom 2', route: '/staff/orders' });
		await withShop(OTHER_SHOP_ID, () =>
			recordError({ where: 'client', message: 'Other shop broke', route: '/' })
		);
		await recordError({ where: 'worker', message: 'no shop', shopId: null });
		const all = await listErrorGroups();
		const boom = all.find((e) => e.message === 'Boom 2')!;
		expect(boom.count).toBe(2);
		expect(all).toHaveLength(3);
		expect((await listErrorGroups({ where: 'client' })).map((e) => e.message)).toEqual([
			'Other shop broke'
		]);
		const mine = await db()<{ message: string }[]>`select message from error_events`;
		expect(mine.map((r) => r.message)).toEqual(['Boom 2']);
		await clearErrorGroup(boom.id);
		expect((await listErrorGroups()).some((e) => e.id === boom.id)).toBe(false);
	});
});
