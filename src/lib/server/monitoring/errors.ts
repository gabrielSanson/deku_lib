// Error tracking (S5.11): unexpected errors from the web app, the worker and staff/customer
// browsers land in error_events, one row per problem (fingerprint) with a running count. The
// platform console lists them. Recording never throws: a broken log must not hide the real error.
import { createHash } from 'node:crypto';
import { currentShopId, inShopScope, platformDb } from '../db';

export type ErrorWhere = 'web' | 'worker' | 'client';
export type UserKind = 'staff' | 'customer' | 'platform' | 'anonymous';

const NO_SHOP = '00000000-0000-0000-0000-000000000000';

export interface ErrorReport {
	where: ErrorWhere;
	message: string;
	stack?: string | null;
	route?: string | null;
	requestId?: string | null;
	userKind?: UserKind | null;
	/** Defaults to the shop of the current request or job. */
	shopId?: string | null;
}

/** Numbers, ids and hex runs vary between occurrences of the same problem; drop them. */
export function normalizeMessage(message: string): string {
	return message
		.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
		.replace(/\b[0-9a-f]{16,}\b/gi, ':hex')
		.replace(/\d+/g, ':n')
		.slice(0, 300);
}

/** The first frame of the stack that is ours names where it broke. */
function topFrame(stack: string | null | undefined): string {
	const line = stack
		?.split('\n')
		.slice(1)
		.find((l) => l.includes('/src/') || l.includes('/scripts/'));
	return line?.trim().replace(/:\d+:\d+\)?$/, '') ?? '';
}

export function fingerprint(r: Pick<ErrorReport, 'where' | 'message' | 'stack' | 'route'>) {
	const route = (r.route ?? '').replace(/[0-9a-f-]{36}/gi, ':id').replace(/\/\d+/g, '/:n');
	return createHash('sha256')
		.update([r.where, route, normalizeMessage(r.message), topFrame(r.stack)].join('|'))
		.digest('hex')
		.slice(0, 32);
}

function shopForReport(explicit: string | null | undefined): string | null {
	if (explicit !== undefined) return explicit;
	if (!inShopScope()) return null;
	const id = currentShopId();
	return id === NO_SHOP ? null : id;
}

export async function recordError(r: ErrorReport): Promise<void> {
	try {
		const shopId = shopForReport(r.shopId);
		await platformDb()`
			insert into error_events (shop_id, fingerprint, "where", route, message, stack, request_id, user_kind)
			values (${shopId}, ${fingerprint(r)}, ${r.where}, ${r.route?.slice(0, 300) ?? null},
				${r.message.slice(0, 1000)}, ${r.stack?.slice(0, 8000) ?? null}, ${r.requestId ?? null},
				${r.userKind ?? null})
			on conflict (coalesce(shop_id, '00000000-0000-0000-0000-000000000000'::uuid), fingerprint)
			do update set count = error_events.count + 1, at = now(), message = excluded.message,
				stack = coalesce(excluded.stack, error_events.stack), request_id = excluded.request_id,
				route = excluded.route`;
	} catch (err) {
		console.error(JSON.stringify({ level: 'error', msg: 'error log failed', err: String(err) }));
	}
	// TODO(verify): optional SENTRY_DSN forwarding to a self-hosted GlitchTip is not built yet.
}

export interface ErrorGroup {
	id: string;
	shopId: string | null;
	shopName: string | null;
	where: ErrorWhere;
	route: string | null;
	message: string;
	stack: string | null;
	requestId: string | null;
	count: number;
	firstAt: Date;
	at: Date;
}

/** Platform console → Erros: the most recent problems first. */
export async function listErrorGroups(
	filter: { where?: ErrorWhere; limit?: number } = {}
): Promise<ErrorGroup[]> {
	const sql = platformDb();
	return sql<ErrorGroup[]>`
		select e.id, e.shop_id as "shopId", s.name as "shopName", e."where", e.route, e.message, e.stack,
			e.request_id as "requestId", e.count, e.first_at as "firstAt", e.at
		from error_events e left join shops s on s.id = e.shop_id
		where ${filter.where ? sql`e."where" = ${filter.where}` : sql`true`}
		order by e.at desc limit ${filter.limit ?? 100}`;
}

export async function clearErrorGroup(id: string) {
	await platformDb()`delete from error_events where id = ${id}`;
}
