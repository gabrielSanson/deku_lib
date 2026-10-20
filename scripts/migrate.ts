// Applies supabase/migrations to a plain PostgreSQL database (local dev without
// Docker, CI and tests). Against a real Supabase project use `supabase db push`.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';

export async function migrate(databaseUrl: string, { shim = true } = {}) {
	const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
	try {
		if (shim) await sql.unsafe(await readFile('db/plain-postgres-shim.sql', 'utf8'));
		await sql`create table if not exists public.local_migrations (
			name text primary key, applied_at timestamptz not null default now())`;
		const dir = 'supabase/migrations';
		const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
		const applied = new Set(
			(await sql<{ name: string }[]>`select name from public.local_migrations`).map((r) => r.name)
		);
		for (const file of files) {
			if (applied.has(file)) continue;
			const text = await readFile(join(dir, file), 'utf8');
			await sql.begin(async (tx) => {
				await tx.unsafe(text);
				await tx`insert into public.local_migrations (name) values (${file})`;
			});
			console.log(`applied ${file}`);
		}
	} finally {
		await sql.end();
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is required');
	await migrate(url);
}
