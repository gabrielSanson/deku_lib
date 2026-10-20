// Creates (or re-activates) the first owner account on a fresh install.
//   node --import tsx scripts/create-owner.ts <email> "<name>" <password>
// On the self-hosted stack: deploy/shop.sh exec shop-web node --import tsx scripts/create-owner.ts …
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const [email, name, password] = process.argv.slice(2);
if (!email || !name || !password) {
	console.error('Usage: create-owner.ts <email> "<name>" <password>');
	process.exit(1);
}
if (password.length < 10) {
	console.error('Use a password with at least 10 characters.');
	process.exit(1);
}
const { DATABASE_URL, PUBLIC_SUPABASE_URL, SUPABASE_INTERNAL_URL, SUPABASE_SERVICE_ROLE_KEY } =
	process.env;
const url = SUPABASE_INTERNAL_URL || PUBLIC_SUPABASE_URL;
if (!DATABASE_URL || !url || !SUPABASE_SERVICE_ROLE_KEY) {
	throw new Error(
		'DATABASE_URL, PUBLIC_SUPABASE_URL (or SUPABASE_INTERNAL_URL) and SUPABASE_SERVICE_ROLE_KEY are required'
	);
}

const admin = createClient(url, SUPABASE_SERVICE_ROLE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});
const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
try {
	const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
	let id = created.data.user?.id;
	if (!id) {
		const [row] = await sql<{ id: string }[]>`select id from auth.users where email = ${email}`;
		id = row?.id;
		if (!id) throw new Error(`could not create ${email}: ${created.error?.message}`);
		await admin.auth.admin.updateUserById(id, { password });
	}
	await sql`
		insert into staff_users (id, display_name, role) values (${id}, ${name}, 'owner')
		on conflict (id) do update set display_name = excluded.display_name, role = 'owner', active = true`;
	console.log(`Owner ready: ${email}. Sign in at /staff/login to run the setup wizard.`);
} finally {
	await sql.end();
}
