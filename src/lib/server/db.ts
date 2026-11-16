import { AsyncLocalStorage } from 'node:async_hooks';
import postgres from 'postgres';
import { config } from './config';

export type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;
/** Either the pool or an open transaction. */
export type Db = Sql | Tx;

/** The shop every row of a single-shop install belongs to. */
export const DEFAULT_SHOP_ID = '00000000-0000-4000-8000-000000000001';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let pool: Sql | undefined;
const shopPools = new Map<string, Sql>();
const MAX_SHOP_POOLS = 50;
interface ShopScope {
	shopId: string;
	/** Use the shop's restricted connection even for the default shop in single-shop mode. */
	forceScoped?: boolean;
}
const scope = new AsyncLocalStorage<ShopScope>();
let processScope: ShopScope | undefined;

function options(extra: postgres.Options<Record<string, never>> = {}) {
	return {
		max: 10,
		idle_timeout: 30,
		// Supabase's transaction pooler does not support prepared statements.
		prepare: false,
		onnotice: () => {},
		...extra
	};
}

/**
 * The pool for platform code: sign-up, the platform console, billing, host lookup, migrations.
 * It sees every shop's rows, so shop code must not use it directly in multi-shop mode.
 */
export function platformDb(): Sql {
	pool ??= postgres(config().DATABASE_URL, options());
	return pool;
}

/**
 * A pool whose connections can only see one shop: they log in as role app_server with
 * app.shop_id set, and row-level security does the rest (migration 20261115000103).
 */
function shopPool(shopId: string): Sql {
	let p = shopPools.get(shopId);
	if (p) {
		// Keep the most recently used pools at the end of the map.
		shopPools.delete(shopId);
		shopPools.set(shopId, p);
		return p;
	}
	if (shopPools.size >= MAX_SHOP_POOLS) {
		const [oldestId, oldest] = shopPools.entries().next().value as [string, Sql];
		shopPools.delete(oldestId);
		void oldest.end({ timeout: 5 });
	}
	p = postgres(
		config().DATABASE_URL,
		options({
			max: 3,
			idle_timeout: 20,
			connection: { role: 'app_server', 'app.shop_id': shopId } as never
		})
	);
	shopPools.set(shopId, p);
	return p;
}

/**
 * The database for the current work. Inside `withShop` it only reaches that shop's rows (in
 * multi-shop mode, or for any shop other than the default one); otherwise it is the main pool.
 */
export function db(): Sql {
	const ctx = scope.getStore() ?? processScope;
	if (ctx && (ctx.shopId !== DEFAULT_SHOP_ID || ctx.forceScoped || config().TENANCY === 'multi')) {
		return shopPool(ctx.shopId);
	}
	return platformDb();
}

/**
 * The shop for work outside any `withShop` (tests, one-off scripts). With `forceScoped`, even the
 * default shop goes through its restricted connection, so tests exercise row-level security.
 */
export function setProcessShop(shopId: string | undefined, opts: { forceScoped?: boolean } = {}) {
	processScope = shopId ? { shopId, ...opts } : undefined;
}

/** Run `fn` as work for one shop: every `db()` call inside it is limited to that shop. */
export function withShop<T>(shopId: string, fn: (sql: Sql) => Promise<T>): Promise<T> {
	if (!UUID.test(shopId)) throw new Error(`withShop: not a shop id: ${shopId}`);
	const forceScoped = processScope?.forceScoped;
	return scope.run({ shopId, forceScoped }, () => fn(db()));
}

/** The shop of the current work: the one set by `withShop`, else the default shop. */
export function currentShopId(): string {
	return (scope.getStore() ?? processScope)?.shopId ?? DEFAULT_SHOP_ID;
}

/** Whether code is running inside `withShop`. */
export function inShopScope(): boolean {
	return (scope.getStore() ?? processScope) !== undefined;
}

export async function closeDb() {
	const all = [pool, ...shopPools.values()];
	pool = undefined;
	shopPools.clear();
	await Promise.all(all.map((p) => p?.end()));
}
