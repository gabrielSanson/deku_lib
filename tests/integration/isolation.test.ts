// S1.1: Postgres keeps shops apart. Generic over every table, so a new table without shop_id or
// without its policy fails here.
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createOrder } from '#lib/server/orders/service.ts';
import { closeDb, DEFAULT_SHOP_ID, platformDb, withShop } from '#lib/server/db.ts';
import { getCatalog } from '#lib/server/catalog/service.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { OTHER_SHOP_ID } from './setup';
import { classic, makeStaff } from './helpers';

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

/** Tables that belong to the platform, not to one shop. */
const PLATFORM_TABLES = new Set([
	'local_migrations',
	'shops',
	'shop_domains',
	'shop_secrets',
	'platform_admins',
	'platform_config',
	'staff_users',
	'backup_runs',
	'system_heartbeats',
	'web_push_keys',
	'plans',
	'platform_settings'
]);
/** Shop tables only platform code may touch (no policy for the app role on purpose). */
const PLATFORM_ONLY = new Set(['shop_secrets']);

async function tables() {
	const all = await platformDb()<{ table_name: string }[]>`
		select table_name from information_schema.tables
		where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`;
	const withShop = await platformDb()<{ table_name: string; is_nullable: string }[]>`
		select table_name, is_nullable from information_schema.columns
		where table_schema = 'public' and column_name = 'shop_id'`;
	return { all: all.map((r) => r.table_name), shopTables: withShop };
}

describe('shops are kept apart', () => {
	it('every business table has shop_id and a policy for the app role', async () => {
		const { all, shopTables } = await tables();
		const scoped = new Set(shopTables.map((t) => t.table_name));
		const missing = all.filter((t) => !scoped.has(t) && !PLATFORM_TABLES.has(t));
		expect(missing).toEqual([]);
		const policies = await platformDb()<{ tablename: string }[]>`
			select distinct tablename from pg_policies
			where schemaname = 'public' and 'app_server' = any(roles)`;
		const covered = new Set(policies.map((p) => p.tablename));
		expect([...scoped].filter((t) => !covered.has(t) && !PLATFORM_ONLY.has(t))).toEqual([]);
		const rls = await platformDb()<{ relname: string }[]>`
			select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
			where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`;
		expect(rls.map((r) => r.relname).filter((t) => t !== 'local_migrations')).toEqual([]);
	});

	it("another shop cannot read, change, delete or add the default shop's rows in any table", async () => {
		const admin = await makeStaff('admin');
		await createOrder({
			channel: 'counter',
			sourceMode: 'staff_pos',
			lines: [classic],
			fulfillmentType: 'counter',
			idempotencyKey: randomUUID(),
			initialStatus: 'confirmed',
			actor: admin
		});
		const { shopTables } = await tables();
		let tablesWithRows = 0;
		for (const { table_name: t } of shopTables.filter((x) => !PLATFORM_ONLY.has(x.table_name))) {
			const [{ n: mine }] = await platformDb().unsafe(
				`select count(*)::int as n from public.${t} where shop_id = $1`,
				[DEFAULT_SHOP_ID]
			);
			if (mine > 0) tablesWithRows++;
			await withShop(OTHER_SHOP_ID, async (sql) => {
				const [{ n }] = await sql.unsafe(
					// Rows with no shop are shared on purpose (the national IBS/CBS rates).
					`select count(*)::int as n from public.${t} where shop_id <> $1`,
					[OTHER_SHOP_ID]
				);
				expect(n, `${t}: rows of another shop are visible`).toBe(0);
				await sql
					.begin(async (tx) => {
						const upd = await tx.unsafe(
							`update public.${t} set shop_id = shop_id where shop_id = $1`,
							[DEFAULT_SHOP_ID]
						);
						expect(upd.count, `${t}: update reached another shop`).toBe(0);
						const del = await tx.unsafe(`delete from public.${t} where shop_id = $1`, [
							DEFAULT_SHOP_ID
						]);
						expect(del.count, `${t}: delete reached another shop`).toBe(0);
						throw new Error('rollback');
					})
					.catch((e) => {
						if (String(e).includes('rollback')) return;
						throw e;
					});
				await expect(
					sql.begin((tx) =>
						tx.unsafe(`insert into public.${t} (shop_id) values ($1)`, [DEFAULT_SHOP_ID])
					),
					`${t}: insert for another shop`
				).rejects.toThrow(/row-level security|null value|violates/);
			});
		}
		expect(tablesWithRows).toBeGreaterThan(15);
	});

	it('each shop sees only its own menu and prices', async () => {
		const mine = await getCatalog();
		const other = await withShop(OTHER_SHOP_ID, () => getCatalog());
		const price = (c: typeof mine, sku: string) =>
			c.products.find((p) => p.sku === sku)?.priceCents;
		expect(other.products.length).toBe(mine.products.length);
		expect(price(other, 'BRG-CLASSICO')).toBe(price(mine, 'BRG-CLASSICO')! + 111);
	});
});
