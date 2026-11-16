// Gives each integration run a freshly migrated database.
import postgres from 'postgres';
import { SYSTEM } from '#lib/server/audit.ts';
import { importCatalog } from '#lib/server/catalog/editor.ts';
import { fixtureCatalog } from '#lib/server/catalog/fixture.ts';
import { resetConfigForTests } from '#lib/server/config.ts';
import { closeDb, platformDb, withShop } from '#lib/server/db.ts';
import { migrate } from '../../scripts/migrate';

export const OTHER_SHOP_ID = '00000000-0000-4000-8000-0000000000b2';

export default async function setup() {
	const url = process.env.TEST_DATABASE_URL;
	if (!url) throw new Error('TEST_DATABASE_URL is required for integration tests');
	const target = new URL(url);
	const name = target.pathname.slice(1);
	const admin = new URL(url);
	admin.pathname = '/postgres';
	const sql = postgres(admin.toString(), { max: 1, onnotice: () => {} });
	await sql.unsafe(`drop database if exists "${name}" with (force)`);
	await sql.unsafe(`create database "${name}"`);
	await sql.end();
	await migrate(url);
	// On a real Supabase the shop role cannot read the auth schema (the grant in the RLS migration
	// is refused there); take it away here too so tests catch shop code that reads auth.users.
	{
		const admin = postgres(url, { max: 1, onnotice: () => {} });
		await admin`revoke all on all tables in schema auth from app_server`;
		await admin`revoke usage on schema auth from app_server`;
		await admin.end();
	}
	// The tests order from the sample menu.
	process.env.DATABASE_URL = url;
	resetConfigForTests();
	await importCatalog(fixtureCatalog, SYSTEM);
	// A second shop with the same menu at other prices: tests act as the default shop and must
	// never see it (row-level security, migration 20261115000103).
	await platformDb()`insert into shops (id, slug, name, status) values (${OTHER_SHOP_ID}, 'outra', 'Outra loja', 'active')`;
	await platformDb()`select init_shop_rows(${OTHER_SHOP_ID})`;
	await withShop(OTHER_SHOP_ID, () =>
		importCatalog(
			{
				...fixtureCatalog,
				products: fixtureCatalog.products.map((p) => ({ ...p, priceCents: p.priceCents + 111 }))
			},
			SYSTEM
		)
	);
	await closeDb();
}
