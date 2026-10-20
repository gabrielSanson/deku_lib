import postgres from 'postgres';
import { config } from './config';

export type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;
/** Either the pool or an open transaction. */
export type Db = Sql | Tx;

let pool: Sql | undefined;

export function db(): Sql {
	pool ??= postgres(config().DATABASE_URL, {
		max: 10,
		idle_timeout: 30,
		// Supabase's transaction pooler does not support prepared statements.
		prepare: false,
		onnotice: () => {}
	});
	return pool;
}

export async function closeDb() {
	await pool?.end();
	pool = undefined;
}
