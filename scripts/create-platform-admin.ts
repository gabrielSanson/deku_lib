// Makes an existing account a platform admin (the /plataforma console on multi-shop installs).
//   node --import tsx scripts/create-platform-admin.ts <email> [password]
// With a password, the account is created first when it does not exist yet.
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const [email, password] = process.argv.slice(2);
if (!email) {
	console.error('Usage: create-platform-admin.ts <email> [password]');
	process.exit(1);
}
if (password && password.length < 12) {
	console.error('Use a password with at least 12 characters.');
	process.exit(1);
}
const { DATABASE_URL, PUBLIC_SUPABASE_URL, SUPABASE_INTERNAL_URL, SUPABASE_SERVICE_ROLE_KEY } =
	process.env;
if (!DATABASE_URL) throw new Error('DATABASE_URL is required');

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
try {
	let [row] = await sql<{ id: string }[]>`select id from auth.users where email = ${email}`;
	if (!row && password) {
		const url = SUPABASE_INTERNAL_URL || PUBLIC_SUPABASE_URL;
		if (!url || !SUPABASE_SERVICE_ROLE_KEY) {
			throw new Error(
				'PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed to create the account'
			);
		}
		const admin = createClient(url, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
		if (!created.data.user) throw new Error(`could not create ${email}: ${created.error?.message}`);
		row = { id: created.data.user.id };
	}
	if (!row) throw new Error(`No account with e-mail ${email}. Pass a password to create it.`);
	await sql`insert into platform_admins (user_id) values (${row.id}) on conflict do nothing`;
	console.log(
		`Platform admin ready: ${email}. Sign in at /plataforma/entrar on the platform domain.`
	);
} finally {
	await sql.end();
}
