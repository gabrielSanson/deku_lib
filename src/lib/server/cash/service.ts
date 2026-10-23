// The cash drawer: opening with a float, cash sales and refunds recorded as they
// happen, sangria and suprimento, and a blind count at close. Every write is
// audited. One drawer, so one open session at a time.
import {
	cashBalance,
	cashDifference,
	type CashBalance,
	type CashMovementKind
} from '#lib/domain/cash.ts';
import type { StaffRole } from '#lib/domain/order-status.ts';
import { audit, type Actor } from '../audit';
import { db, type Db, type Tx } from '../db';
import { DomainError } from '../errors';

type StaffActor = Actor & { role: StaffRole };

export interface CashSession {
	id: string;
	status: 'open' | 'closed';
	openedBy: string;
	openedByName: string;
	openedAt: Date;
	openingFloatCents: number;
	closedByName: string | null;
	closedAt: Date | null;
	countedCents: number | null;
	expectedCents: number | null;
	differenceCents: number | null;
	closeNote: string | null;
}

export interface CashMovement {
	id: string;
	kind: CashMovementKind;
	amountCents: number;
	orderNumber: number | null;
	reason: string | null;
	recordedByName: string | null;
	createdAt: Date;
}

interface SessionRow {
	id: string;
	status: 'open' | 'closed';
	opened_by: string;
	opened_by_name: string;
	opened_at: Date;
	opening_float_cents: number;
	closed_by_name: string | null;
	closed_at: Date | null;
	counted_cents: number | null;
	expected_cents: number | null;
	difference_cents: number | null;
	close_note: string | null;
}

function toSession(r: SessionRow): CashSession {
	return {
		id: r.id,
		status: r.status,
		openedBy: r.opened_by,
		openedByName: r.opened_by_name,
		openedAt: r.opened_at,
		openingFloatCents: r.opening_float_cents,
		closedByName: r.closed_by_name,
		closedAt: r.closed_at,
		countedCents: r.counted_cents,
		expectedCents: r.expected_cents,
		differenceCents: r.difference_cents,
		closeNote: r.close_note
	};
}

function requireCounter(actor: StaffActor) {
	if (actor.role === 'kitchen')
		throw new DomainError('err.cash.forbidden', { code: 'forbidden', status: 403 });
}

const SESSION_COLUMNS = (sql: Db) => sql`
	s.id, s.status, s.opened_by, o.display_name as opened_by_name, s.opened_at,
	s.opening_float_cents, c.display_name as closed_by_name, s.closed_at, s.counted_cents,
	s.expected_cents, s.difference_cents, s.close_note`;

export async function getOpenSession(sql: Db = db()): Promise<CashSession | null> {
	const [row] = await sql<SessionRow[]>`
		select ${SESSION_COLUMNS(sql)}
		from cash_sessions s
		join staff_users o on o.id = s.opened_by
		left join staff_users c on c.id = s.closed_by
		where s.status = 'open'`;
	return row ? toSession(row) : null;
}

export async function getSession(id: string, sql: Db = db()): Promise<CashSession | null> {
	const [row] = await sql<SessionRow[]>`
		select ${SESSION_COLUMNS(sql)}
		from cash_sessions s
		join staff_users o on o.id = s.opened_by
		left join staff_users c on c.id = s.closed_by
		where s.id = ${id}`;
	return row ? toSession(row) : null;
}

/** Sessions opened on a shop-local day, newest first. */
export async function listSessionsForDay(
	day: string,
	timeZone: string,
	sql: Db = db()
): Promise<CashSession[]> {
	const rows = await sql<SessionRow[]>`
		select ${SESSION_COLUMNS(sql)}
		from cash_sessions s
		join staff_users o on o.id = s.opened_by
		left join staff_users c on c.id = s.closed_by
		where s.opened_at >= (${day}::timestamp at time zone ${timeZone})
			and s.opened_at < ((${day}::timestamp + interval '1 day') at time zone ${timeZone})
		order by s.opened_at desc`;
	return rows.map(toSession);
}

export async function listMovements(sessionId: string, sql: Db = db()): Promise<CashMovement[]> {
	const rows = await sql<
		{
			id: string;
			kind: CashMovementKind;
			amount_cents: number;
			order_number: number | null;
			reason: string | null;
			recorded_by_name: string | null;
			created_at: Date;
		}[]
	>`
		select m.id, m.kind, m.amount_cents, o.order_number, m.reason,
			u.display_name as recorded_by_name, m.created_at
		from cash_movements m
		left join tenders t on t.id = m.tender_id
		left join orders o on o.id = t.order_id
		left join staff_users u on u.id = m.recorded_by
		where m.session_id = ${sessionId}
		order by m.created_at desc`;
	return rows.map((r) => ({
		id: r.id,
		kind: r.kind,
		amountCents: r.amount_cents,
		orderNumber: r.order_number,
		reason: r.reason,
		recordedByName: r.recorded_by_name,
		createdAt: r.created_at
	}));
}

export async function sessionBalance(
	session: Pick<CashSession, 'id' | 'openingFloatCents'>,
	sql: Db = db()
): Promise<CashBalance> {
	const rows = await sql<{ kind: CashMovementKind; amount_cents: number }[]>`
		select kind, amount_cents from cash_movements where session_id = ${session.id}`;
	return cashBalance(
		session.openingFloatCents,
		rows.map((r) => ({ kind: r.kind, amountCents: r.amount_cents }))
	);
}

export async function openSession(input: { floatCents: number; actor: StaffActor }) {
	requireCounter(input.actor);
	if (!Number.isInteger(input.floatCents) || input.floatCents < 0)
		throw new DomainError('err.cash.float');
	return db().begin(async (tx) => {
		const [open] = await tx`select id from cash_sessions where status = 'open' for update`;
		if (open) throw new DomainError('err.cash.alreadyOpen', { code: 'already_open', status: 409 });
		const [row] = await tx<{ id: string }[]>`
			insert into cash_sessions (opened_by, opening_float_cents)
			values (${input.actor.id}, ${input.floatCents})
			on conflict do nothing
			returning id`;
		if (!row) throw new DomainError('err.cash.alreadyOpen', { code: 'already_open', status: 409 });
		await audit(tx, input.actor, 'cash.opened', 'cash_session', row.id, {
			float_cents: input.floatCents
		});
		return { id: row.id };
	});
}

/** Sangria (cash taken out) or suprimento (cash put in). The amount is always positive. */
export async function recordDrawerMovement(input: {
	kind: 'sangria' | 'suprimento';
	amountCents: number;
	reason: string;
	actor: StaffActor;
}) {
	requireCounter(input.actor);
	if (!Number.isInteger(input.amountCents) || input.amountCents <= 0)
		throw new DomainError('err.amount.required');
	if (input.kind === 'sangria' && !input.reason.trim())
		throw new DomainError('err.cash.reason', { code: 'reason_required' });
	return db().begin(async (tx) => {
		const session = await lockOpenSession(tx);
		if (input.kind === 'sangria') {
			const balance = await sessionBalance(session, tx);
			if (input.amountCents > balance.expectedCents) throw new DomainError('err.cash.overdraw');
		}
		const signed = input.kind === 'sangria' ? -input.amountCents : input.amountCents;
		await tx`
			insert into cash_movements (session_id, kind, amount_cents, reason, recorded_by)
			values (${session.id}, ${input.kind}, ${signed}, ${input.reason.trim() || null}, ${input.actor.id})`;
		await audit(tx, input.actor, `cash.${input.kind}`, 'cash_session', session.id, {
			amount_cents: input.amountCents,
			reason: input.reason.trim() || null
		});
	});
}

/**
 * Closes the drawer with a blind count: the expected figure is computed here,
 * after the count is typed, and the difference is stored for good.
 */
export async function closeSession(input: {
	countedCents: number;
	note?: string | null;
	actor: StaffActor;
}) {
	requireCounter(input.actor);
	if (!Number.isInteger(input.countedCents) || input.countedCents < 0)
		throw new DomainError('err.cash.counted');
	return db().begin(async (tx) => {
		const session = await lockOpenSession(tx);
		const balance = await sessionBalance(session, tx);
		const difference = cashDifference(input.countedCents, balance.expectedCents);
		await tx`
			update cash_sessions set status = 'closed', closed_by = ${input.actor.id}, closed_at = now(),
				counted_cents = ${input.countedCents}, expected_cents = ${balance.expectedCents},
				difference_cents = ${difference}, close_note = ${input.note?.trim() || null}
			where id = ${session.id}`;
		await audit(tx, input.actor, 'cash.closed', 'cash_session', session.id, {
			counted_cents: input.countedCents,
			expected_cents: balance.expectedCents,
			difference_cents: difference
		});
		return {
			id: session.id,
			...balance,
			countedCents: input.countedCents,
			differenceCents: difference
		};
	});
}

async function lockOpenSession(tx: Tx) {
	const [row] = await tx<{ id: string; opening_float_cents: number }[]>`
		select id, opening_float_cents from cash_sessions where status = 'open' for update`;
	if (!row) throw new DomainError('err.cash.closed', { code: 'cash_closed', status: 409 });
	return { id: row.id, openingFloatCents: row.opening_float_cents };
}

/** Called inside the tender transaction: cash kept from a sale goes into the open drawer. */
export async function recordCashSale(tx: Tx, tenderId: string, amountCents: number, actor: Actor) {
	const [row] = await tx<{ id: string }[]>`
		select id from cash_sessions where status = 'open' for share`;
	if (!row) throw new DomainError('err.cash.closedCash', { code: 'cash_closed', status: 409 });
	await tx`
		insert into cash_movements (session_id, kind, amount_cents, tender_id, recorded_by)
		values (${row.id}, 'sale', ${amountCents}, ${tenderId}, ${actor.id})
		on conflict do nothing`;
}

/** Called inside the refund transaction: cash handed back leaves the open drawer. */
export async function recordCashRefund(
	tx: Tx,
	tenderId: string,
	amountCents: number,
	actor: Actor
) {
	const [row] = await tx<{ id: string }[]>`
		select id from cash_sessions where status = 'open' for share`;
	if (!row) throw new DomainError('err.cash.closedRefund', { code: 'cash_closed', status: 409 });
	await tx`
		insert into cash_movements (session_id, kind, amount_cents, tender_id, recorded_by)
		values (${row.id}, 'refund', ${-amountCents}, ${tenderId}, ${actor.id})
		on conflict do nothing`;
}
