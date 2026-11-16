// Kitchen tickets through a server queue (D3). A paired screen claims one job at a time with
// FOR UPDATE SKIP LOCKED, so two screens never print the same ticket; a claim that is not
// acknowledged within 60 s goes back to the queue, and after 3 tries the job shows as failed.
import { createHash, randomBytes } from 'node:crypto';
import { audit, type Actor } from '../audit';
import { db, type Db } from '../db';
import { DomainError } from '../errors';

export const CLAIM_TIMEOUT_SECONDS = 60;
export const MAX_ATTEMPTS = 3;
export const STATION_COOKIE = 'print_station';

export type PrintKind = 'kitchen' | 'receipt' | 'fiscal';
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export async function pairStation(name: string, roles: ('kitchen' | 'receipt')[], actor: Actor) {
	const clean = name.trim().slice(0, 60) || 'Cozinha';
	if (roles.length === 0) throw new DomainError('err.print.roles');
	const token = randomBytes(32).toString('hex');
	return db().begin(async (tx) => {
		const [s] = await tx<{ id: string }[]>`
			insert into print_stations (name, token_hash, roles, created_by)
			values (${clean}, ${hash(token)}, ${roles}, ${actor.id}) returning id`;
		await audit(tx, actor, 'print.station_paired', 'print_station', s.id, { name: clean, roles });
		return { id: s.id, token };
	});
}

export async function unpairStation(id: string, actor: Actor) {
	await db().begin(async (tx) => {
		await tx`delete from print_stations where id = ${id}`;
		await audit(tx, actor, 'print.station_removed', 'print_station', id, {});
	});
}

export interface Station {
	id: string;
	name: string;
	roles: PrintKind[];
}

/** The station a device's cookie belongs to (and marks it seen). */
export async function stationByToken(token: string | undefined): Promise<Station | null> {
	if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
	const [s] = await db()<Station[]>`
		update print_stations set last_seen_at = now() where token_hash = ${hash(token)}
		returning id, name, roles`;
	return s ?? null;
}

export async function listStations() {
	return db()<{ id: string; name: string; roles: string[]; lastSeenAt: Date | null }[]>`
		select id, name, roles, last_seen_at as "lastSeenAt" from print_stations order by created_at`;
}

/** Queues a ticket inside the order's transaction, only when some screen prints that kind. */
export async function enqueuePrint(tx: Db, orderId: string, kind: PrintKind = 'kitchen') {
	await tx`
		insert into print_jobs (order_id, kind)
		select ${orderId}, ${kind}
		where exists (select 1 from print_stations where ${kind} = any(roles))
		on conflict (order_id, kind) where reprint_of is null do nothing`;
}

export async function reprint(orderId: string, kind: PrintKind, actor: Actor) {
	return db().begin(async (tx) => {
		const [last] = await tx<{ id: string }[]>`
			select id from print_jobs where order_id = ${orderId} and kind = ${kind}
			order by created_at desc limit 1`;
		const [j] = await tx<{ id: string }[]>`
			insert into print_jobs (order_id, kind, reprint_of) values (${orderId}, ${kind}, ${last?.id ?? null})
			returning id`;
		// Without a previous job this is the order's first ticket of that kind; keep the unique rule.
		if (!last) await tx`update print_jobs set reprint_of = id where id = ${j.id}`;
		await audit(tx, actor, 'print.reprint', 'order', orderId, { kind });
		return j.id;
	});
}

/** Stale claims go back to the queue; jobs out of tries fail. */
async function releaseStale(sql: Db) {
	await sql`update print_jobs set status = case when attempts >= ${MAX_ATTEMPTS} then 'failed' else 'queued' end,
			station_id = null,
			error = case when attempts >= ${MAX_ATTEMPTS} then 'sem confirmação da impressora' else error end
		where status = 'claimed' and claimed_at < now() - make_interval(secs => ${CLAIM_TIMEOUT_SECONDS})`;
}

export interface ClaimedJob {
	id: string;
	orderId: string;
	kind: PrintKind;
	attempts: number;
}

/** The next job for this station, or null. Orders for later wait until the kitchen sees them. */
export async function claimJob(station: Station): Promise<ClaimedJob | null> {
	const sql = db();
	await releaseStale(sql);
	const [j] = await sql<ClaimedJob[]>`
		update print_jobs set status = 'claimed', station_id = ${station.id}, claimed_at = now(),
			attempts = attempts + 1
		where id = (
			select j.id from print_jobs j join orders o on o.id = j.order_id
			where j.status = 'queued' and j.kind = any(${station.roles})
				and (o.scheduled_for is null or o.scheduled_for - make_interval(mins => (
					select prep_time_minutes from store_runtime_settings s where s.shop_id = o.shop_id)) <= now())
			order by j.created_at for update of j skip locked limit 1)
		returning id, order_id as "orderId", kind, attempts`;
	return j ?? null;
}

/** The screen printed it (or could not). */
export async function ackJob(station: Station, jobId: string, ok: boolean, error?: string | null) {
	const [j] = await db()<{ id: string }[]>`
		update print_jobs set
			status = case when ${ok} then 'printed' when attempts >= ${MAX_ATTEMPTS} then 'failed' else 'queued' end,
			printed_at = case when ${ok} then now() else printed_at end,
			station_id = case when ${ok} then station_id else null end,
			error = case when ${ok} then null else ${error?.slice(0, 200) ?? 'falha ao imprimir'} end
		where id = ${jobId} and station_id = ${station.id} and status = 'claimed'
		returning id`;
	return !!j;
}

/** The latest job per kind for an order (shown on the order page). */
export async function printStatus(orderId: string) {
	return db()<
		{ id: string; kind: PrintKind; status: string; attempts: number; error: string | null }[]
	>`
		select distinct on (kind) id, kind, status, attempts, error from print_jobs
		where order_id = ${orderId} order by kind, created_at desc`;
}
