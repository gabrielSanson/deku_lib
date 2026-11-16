// S1 gate: a single-shop install made before many-shops support upgrades with no manual step.
import postgres from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';
import { migrate } from '../../scripts/migrate';

const url = new URL(process.env.TEST_DATABASE_URL!);
const name = `${url.pathname.slice(1)}_upgrade`;
const target = new URL(url);
target.pathname = `/${name}`;
const admin = new URL(url);
admin.pathname = '/postgres';

let sql: postgres.Sql | undefined;
afterAll(async () => {
	await sql?.end();
	const a = postgres(admin.toString(), { max: 1, onnotice: () => {} });
	await a.unsafe(`drop database if exists "${name}" with (force)`);
	await a.end();
});

const DEFAULT_SHOP = '00000000-0000-4000-8000-000000000001';

describe('upgrading a single-shop install', () => {
	it('moves existing data into the default shop and keeps taking orders', async () => {
		const a = postgres(admin.toString(), { max: 1, onnotice: () => {} });
		await a.unsafe(`drop database if exists "${name}" with (force)`);
		await a.unsafe(`create database "${name}"`);
		await a.end();

		// Data as the live shop has it at 5071c77 + the launch fixes.
		await migrate(target.toString(), { until: '20261115000101' });
		sql = postgres(target.toString(), { max: 1, onnotice: () => {} });
		const [u] = await sql<
			{ id: string }[]
		>`insert into auth.users (email) values ('dono@loja.test') returning id`;
		await sql`insert into staff_users (id, display_name, role) values (${u.id}, 'Dono', 'admin')`;
		await sql`update store_profile set display_name = 'Lanchonete Antiga' where id = 1`;
		await sql`insert into menu_categories (id, name) values ('lanches', 'Lanches')`;
		await sql`insert into menu_products (sku, slug, name, category_id, price_cents)
			values ('X-1', 'x-salada', 'X-Salada', 'lanches', 2500)`;
		await sql`insert into orders (channel, source_mode, status, fulfillment_type, subtotal_cents, total_cents)
			values ('counter', 'staff_pos', 'completed', 'counter', 2500, 2500)`;
		const [{ before }] = await sql<
			{ before: number }[]
		>`select max(order_number) as before from orders`;
		await sql.end();
		sql = undefined;

		await migrate(target.toString());
		sql = postgres(target.toString(), { max: 1, onnotice: () => {} });

		const [shop] = await sql<
			{ name: string; status: string }[]
		>`select name, status from shops where id = ${DEFAULT_SHOP}`;
		expect(shop).toEqual({ name: 'Lanchonete Antiga', status: 'active' });
		const [member] = await sql`select role, display_name from shop_members where user_id = ${u.id}`;
		expect(member).toEqual({ role: 'admin', display_name: 'Dono' });
		for (const t of ['menu_products', 'orders', 'store_profile', 'store_runtime_settings']) {
			const [{ n }] = await sql.unsafe(`select count(*)::int as n from ${t} where shop_id <> $1`, [
				DEFAULT_SHOP
			]);
			expect(n, t).toBe(0);
		}

		// The next order continues the old numbering, and writes need no shop id from the app.
		const [next] = await sql<{ order_number: number; shop_id: string }[]>`
			insert into orders (channel, source_mode, status, fulfillment_type, subtotal_cents, total_cents)
			values ('counter', 'staff_pos', 'new', 'counter', 2500, 2500) returning order_number, shop_id`;
		expect(next).toEqual({ order_number: before + 1, shop_id: DEFAULT_SHOP });
	});
});
