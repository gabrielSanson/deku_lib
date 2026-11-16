// The shop's own couriers (S5.3). Ready deliveries are grouped into a run for one courier, who
// opens a private link to tap "Saiu" and "Entregue". Settling a run books the payout as an
// expense, so the month's result shows it. Cash is never collected on delivery (owner rule).
import { createHash, randomBytes } from 'node:crypto';
import { audit, SYSTEM, type Actor } from '../audit';
import { db, type Db, type Tx } from '../db';
import { DomainError } from '../errors';
import { enqueue, QUEUES } from '../jobs';
import { categories } from '../expenses/service';
import { transitionOrder } from '../orders/service';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const newToken = () => randomBytes(24).toString('hex');
export const COURIER_CATEGORY = 'Entregadores';

export interface Courier {
	id: string;
	name: string;
	phone: string | null;
	payPerDeliveryCents: number;
	active: boolean;
}

export async function listCouriers(sql: Db = db()) {
	return sql<Courier[]>`
		select id, name, phone, pay_per_delivery_cents as "payPerDeliveryCents", active
		from couriers order by active desc, name`;
}

function checkCourier(i: { name: string; payPerDeliveryCents: number }) {
	if (!i.name.trim() || i.name.trim().length > 60) throw new DomainError('err.courier.name');
	if (
		!Number.isInteger(i.payPerDeliveryCents) ||
		i.payPerDeliveryCents < 0 ||
		i.payPerDeliveryCents > 100_000
	)
		throw new DomainError('err.courier.pay');
}

/** Adds a courier; returns the private link token (shown once). */
export async function addCourier(
	i: { name: string; phone?: string | null; payPerDeliveryCents: number },
	actor: Actor
) {
	checkCourier(i);
	const token = newToken();
	return db().begin(async (tx) => {
		const [c] = await tx<{ id: string }[]>`
			insert into couriers (name, phone, pay_per_delivery_cents, access_token_hash)
			values (${i.name.trim()}, ${i.phone?.trim() || null}, ${i.payPerDeliveryCents}, ${hash(token)})
			returning id`;
		await audit(tx, actor, 'courier.added', 'courier', c.id, { name: i.name.trim() });
		return { id: c.id, token };
	});
}

export async function updateCourier(
	id: string,
	i: { name: string; phone?: string | null; payPerDeliveryCents: number; active: boolean },
	actor: Actor
) {
	checkCourier(i);
	await db().begin(async (tx) => {
		await tx`update couriers set name = ${i.name.trim()}, phone = ${i.phone?.trim() || null},
			pay_per_delivery_cents = ${i.payPerDeliveryCents}, active = ${i.active} where id = ${id}`;
		await audit(tx, actor, 'courier.updated', 'courier', id, { active: i.active });
	});
}

/** A new link; the old one stops working. */
export async function newCourierLink(id: string, actor: Actor) {
	const token = newToken();
	await db().begin(async (tx) => {
		await tx`update couriers set access_token_hash = ${hash(token)} where id = ${id}`;
		await audit(tx, actor, 'courier.link_reset', 'courier', id, {});
	});
	return token;
}

export async function courierByToken(token: string, sql: Db = db()) {
	if (!/^[0-9a-f]{48}$/.test(token)) return null;
	const [c] = await sql<Courier[]>`
		select id, name, phone, pay_per_delivery_cents as "payPerDeliveryCents", active
		from couriers where access_token_hash = ${hash(token)} and active`;
	return c ?? null;
}

/** The shop dispatches with its own couriers (then "saiu" is sent when the run leaves). */
export async function usesCouriers(sql: Db = db()) {
	const [r] = await sql<
		{ yes: boolean }[]
	>`select exists (select 1 from couriers where active) as yes`;
	return !!r?.yes;
}

export interface DispatchOrder {
	id: string;
	orderNumber: number;
	status: string;
	totalCents: number;
	readyAt: Date | null;
	recipient: string | null;
	street: string | null;
	number: string | null;
	complement: string | null;
	neighborhood: string | null;
	city: string | null;
	state: string | null;
	cep: string | null;
	instructions: string | null;
	deliveredAt?: Date | null;
}

const ORDER_COLUMNS = (sql: Db) => sql`
	o.id, o.order_number as "orderNumber", o.status, o.total_cents as "totalCents",
	o.ready_at as "readyAt", a.recipient, a.street, a.number, a.complement, a.neighborhood,
	a.city, a.state, a.cep, a.instructions`;

/** Own-driver deliveries being prepared or ready that are not in a run yet. */
export async function awaitingDispatch(sql: Db = db()) {
	return sql<DispatchOrder[]>`
		select ${ORDER_COLUMNS(sql)}
		from orders o left join order_addresses a on a.order_id = o.id
		where o.fulfillment_type = 'delivery' and o.fulfillment_provider = 'own_driver'
			and o.status in ('confirmed', 'preparing', 'ready') and not o.is_test
			and not exists (select 1 from deliveries d where d.order_id = o.id)
		order by o.status = 'ready' desc, coalesce(o.ready_at, o.created_at)`;
}

export interface Run {
	id: string;
	courierId: string;
	courier: string;
	payPerDeliveryCents: number;
	createdAt: Date;
	leftAt: Date | null;
	returnedAt: Date | null;
	settledAt: Date | null;
	payoutCents: number | null;
	orders: DispatchOrder[];
}

async function runsWhere(sql: Db, where: ReturnType<Db>) {
	const runs = await sql<Omit<Run, 'orders'>[]>`
		select r.id, r.courier_id as "courierId", c.name as courier,
			c.pay_per_delivery_cents as "payPerDeliveryCents", r.created_at as "createdAt",
			r.left_at as "leftAt", r.returned_at as "returnedAt", r.settled_at as "settledAt",
			r.payout_cents as "payoutCents"
		from delivery_runs r join couriers c on c.id = r.courier_id
		where ${where} order by r.created_at desc limit 50`;
	if (runs.length === 0) return [];
	const orders = await sql<(DispatchOrder & { runId: string })[]>`
		select d.run_id as "runId", d.delivered_at as "deliveredAt", ${ORDER_COLUMNS(sql)}
		from deliveries d join orders o on o.id = d.order_id
		left join order_addresses a on a.order_id = o.id
		where d.run_id in ${sql(runs.map((r) => r.id))} order by d.position, o.order_number`;
	return runs.map((r) => ({ ...r, orders: orders.filter((o) => o.runId === r.id) }));
}

/** Runs not settled yet, and the ones settled today. */
export async function openRuns(sql: Db = db()) {
	return runsWhere(sql, sql`r.settled_at is null or r.settled_at > now() - interval '18 hours'`);
}

export async function getRun(id: string, sql: Db = db()) {
	return (await runsWhere(sql, sql`r.id = ${id}`))[0] ?? null;
}

/** Groups deliveries into a run for one courier. */
export async function createRun(courierId: string, orderIds: string[], actor: Actor) {
	if (orderIds.length === 0) throw new DomainError('err.courier.noOrders');
	return db().begin(async (tx) => {
		const [c] = await tx<
			{ id: string }[]
		>`select id from couriers where id = ${courierId} and active`;
		if (!c) throw new DomainError('err.courier.notFound');
		const ok = await tx<{ id: string }[]>`
			select id from orders where id in ${tx(orderIds)} and fulfillment_type = 'delivery'
				and status in ('confirmed', 'preparing', 'ready') for update`;
		if (ok.length !== orderIds.length) throw new DomainError('err.courier.badOrder');
		const [r] = await tx<{ id: string }[]>`
			insert into delivery_runs (courier_id, created_by) values (${courierId}, ${actor.id}) returning id`;
		for (const [i, id] of orderIds.entries()) {
			const [d] = await tx<{ order_id: string }[]>`
				insert into deliveries (order_id, run_id, position) values (${id}, ${r.id}, ${i})
				on conflict (order_id) do nothing returning order_id`;
			if (!d) throw new DomainError('err.courier.taken');
		}
		await audit(tx, actor, 'delivery.run_created', 'delivery_run', r.id, {
			courierId,
			orders: orderIds.length
		});
		return r.id;
	});
}

/** Takes an order out of a run that has not left yet. */
export async function removeFromRun(orderId: string, actor: Actor) {
	await db().begin(async (tx) => {
		const [d] = await tx<{ run_id: string }[]>`
			delete from deliveries d using delivery_runs r
			where d.order_id = ${orderId} and r.id = d.run_id and r.left_at is null returning d.run_id`;
		if (!d) throw new DomainError('err.courier.alreadyLeft');
		await tx`delete from delivery_runs r where r.id = ${d.run_id}
			and not exists (select 1 from deliveries where run_id = r.id)`;
		await audit(tx, actor, 'delivery.removed', 'order', orderId, { runId: d.run_id });
	});
}

/** "Saiu": every order in the run is ready (moved there if needed) and customers are told. */
export async function markLeft(runId: string, actor: Actor, courierId?: string) {
	await db().begin(async (tx) => {
		const [r] = await tx<{ id: string; left_at: Date | null }[]>`
			select id, left_at from delivery_runs where id = ${runId}
				and (${courierId ?? null}::uuid is null or courier_id = ${courierId ?? null}) for update`;
		if (!r) throw new DomainError('err.courier.notFound');
		if (r.left_at) return;
		const orders = await tx<{ order_id: string; status: string }[]>`
			select d.order_id, o.status from deliveries d join orders o on o.id = d.order_id
			where d.run_id = ${runId}`;
		for (const o of orders) {
			// A courier leaving with the bag means the kitchen is done with it.
			if (o.status === 'confirmed' || o.status === 'preparing') {
				if (o.status === 'confirmed')
					await transitionOrder({ orderId: o.order_id, to: 'preparing', actor: SYSTEM }, tx as Tx);
				await transitionOrder({ orderId: o.order_id, to: 'ready', actor: SYSTEM }, tx as Tx);
			}
			await enqueue(
				tx,
				QUEUES.whatsappNotify,
				{ orderId: o.order_id, event: 'out' },
				{ singletonKey: `out:${o.order_id}` }
			);
		}
		await tx`update delivery_runs set left_at = now() where id = ${runId}`;
		await audit(tx, actor, 'delivery.left', 'delivery_run', runId, { orders: orders.length });
	});
}

/** "Entregue": the order completes; the run is back when every order is delivered. */
export async function markDelivered(orderId: string, actor: Actor, courierId?: string) {
	await db().begin(async (tx) => {
		const [d] = await tx<{ run_id: string; delivered_at: Date | null; left_at: Date | null }[]>`
			select d.run_id, d.delivered_at, r.left_at from deliveries d
			join delivery_runs r on r.id = d.run_id
			where d.order_id = ${orderId}
				and (${courierId ?? null}::uuid is null or r.courier_id = ${courierId ?? null})
			for update of d`;
		if (!d) throw new DomainError('err.courier.notFound');
		if (d.delivered_at) return;
		if (!d.left_at) throw new DomainError('err.courier.notLeft');
		await tx`update deliveries set delivered_at = now() where order_id = ${orderId}`;
		const [o] = await tx<{ status: string }[]>`select status from orders where id = ${orderId}`;
		if (o.status === 'ready')
			await transitionOrder({ orderId, to: 'completed', actor: SYSTEM }, tx as Tx);
		await tx`update delivery_runs r set returned_at = now() where r.id = ${d.run_id}
			and not exists (select 1 from deliveries where run_id = r.id and delivered_at is null)`;
		await audit(tx, actor, 'delivery.delivered', 'order', orderId, { runId: d.run_id });
	});
}

async function courierCategory(tx: Db) {
	await categories(tx); // seeds the default list first, so Despesas is never left with one category
	const [c] = await tx<{ id: string }[]>`
		select id from expense_categories where name = ${COURIER_CATEGORY} and active`;
	if (c) return c.id;
	const [n] = await tx<{ id: string }[]>`
		insert into expense_categories (name, pl_line) values (${COURIER_CATEGORY}, 'pessoal')
		on conflict do nothing returning id`;
	if (n) return n.id;
	const [again] = await tx<{ id: string }[]>`
		select id from expense_categories where name = ${COURIER_CATEGORY}`;
	return again.id;
}

/** Pays the courier for the delivered orders and books it as an expense of this month. */
export async function settleRun(runId: string, actor: Actor) {
	return db().begin(async (tx) => {
		const [r] = await tx<
			{ settled_at: Date | null; pay: number; courier: string; delivered: number; month: string }[]
		>`
			select r.settled_at, c.pay_per_delivery_cents as pay, c.name as courier,
				(select count(*)::int from deliveries d where d.run_id = r.id and d.delivered_at is not null) as delivered,
				to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM') as month
			from delivery_runs r join couriers c on c.id = r.courier_id where r.id = ${runId} for update of r`;
		if (!r) throw new DomainError('err.courier.notFound');
		if (r.settled_at) throw new DomainError('err.courier.settled');
		const payout = r.delivered * r.pay;
		let expenseId: string | null = null;
		if (payout > 0) {
			const [e] = await tx<{ id: string }[]>`
				insert into expenses (category_id, description, amount_cents, competence_month, paid_at, created_by)
				values (${await courierCategory(tx)}, ${`Entregas: ${r.courier} (${r.delivered})`.slice(0, 120)},
					${payout}, ${`${r.month}-01`}, now(), ${actor.id}) returning id`;
			expenseId = e.id;
		}
		await tx`update delivery_runs set settled_at = now(), payout_cents = ${payout},
			expense_id = ${expenseId} where id = ${runId}`;
		await audit(tx, actor, 'delivery.settled', 'delivery_run', runId, { payout });
		return payout;
	});
}

/** What a courier sees on their link: runs not back yet, and today's finished ones. */
export async function courierRuns(courierId: string, sql: Db = db()) {
	return runsWhere(
		sql,
		sql`r.courier_id = ${courierId} and (r.returned_at is null or r.returned_at > now() - interval '12 hours')`
	);
}

/** For the tracking page: when the order left with a courier. */
export async function deliveryState(orderId: string, sql: Db = db()) {
	const [d] = await sql<{ leftAt: Date | null; deliveredAt: Date | null }[]>`
		select r.left_at as "leftAt", d.delivered_at as "deliveredAt" from deliveries d
		join delivery_runs r on r.id = d.run_id where d.order_id = ${orderId}`;
	return d ?? null;
}

/** A Google Maps search link for an address (no API key needed). */
export function mapLink(
	o: Pick<DispatchOrder, 'street' | 'number' | 'neighborhood' | 'city' | 'state' | 'cep'>
) {
	const q = [`${o.street ?? ''} ${o.number ?? ''}`.trim(), o.neighborhood, o.city, o.state, o.cep]
		.filter(Boolean)
		.join(', ');
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
