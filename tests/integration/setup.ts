// Gives each integration run a freshly migrated database.
import postgres from 'postgres';
import { migrate } from '../../scripts/migrate';

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
}
