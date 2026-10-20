// Seeds a usable local/staging setup: staff accounts, delivery zones and an
// open store. Staff users are created through the Supabase Auth admin API.
//   DATABASE_URL, PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY are required.
//   SEED_PASSWORD sets the password for every seeded account (default: burger123).
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const { DATABASE_URL, PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const password = process.env.SEED_PASSWORD ?? 'burger123';
if (!DATABASE_URL || !PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	throw new Error('DATABASE_URL, PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}
if (process.env.NODE_ENV === 'production' && !process.env.SEED_PASSWORD) {
	throw new Error('Set SEED_PASSWORD when seeding a production project');
}

const staff = [
	{ email: 'dono@burger.local', name: 'Dono', role: 'owner' },
	{ email: 'gerente@burger.local', name: 'Gerente', role: 'manager' },
	{ email: 'caixa@burger.local', name: 'Caixa', role: 'cashier' },
	{ email: 'cozinha@burger.local', name: 'Cozinha', role: 'kitchen' }
];

const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});
const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

try {
	for (const s of staff) {
		let id: string | undefined;
		const created = await admin.auth.admin.createUser({
			email: s.email,
			password,
			email_confirm: true
		});
		if (created.data.user) id = created.data.user.id;
		else {
			const [row] = await sql<{ id: string }[]>`select id from auth.users where email = ${s.email}`;
			id = row?.id;
		}
		if (!id) throw new Error(`could not create ${s.email}: ${created.error?.message}`);
		await sql`
			insert into staff_users (id, display_name, role) values (${id}, ${s.name}, ${s.role})
			on conflict (id) do update set display_name = excluded.display_name, role = excluded.role, active = true`;
		console.log(`staff ${s.email} (${s.role})`);
	}
	await sql`
		insert into delivery_rules (name, match_kind, match_value, fee_cents, min_order_cents, priority) values
			('Centro', 'cep_prefix', '01000', 590, 2500, 10),
			('Bela Vista', 'neighborhood', 'Bela Vista', 790, 3000, 20),
			('Consolação', 'neighborhood', 'Consolação', 890, 3000, 20)
		on conflict (match_kind, match_value) do nothing`;
	await sql`
		update store_runtime_settings set accepting_orders = true, pause_reason = null, web_ordering_enabled = true,
			delivery_enabled = true, pickup_enabled = true where id = 1`;
	console.log(`seeded; staff password: ${password}`);
} finally {
	await sql.end();
}
