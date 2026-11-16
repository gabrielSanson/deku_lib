// Despesas and the monthly result. Categories are created on first use; recurring expenses are
// entered once a month by a job (on or after their day).
import { buildDre, PL_LINES, type PlLine } from '#lib/domain/dre.ts';
import { profitReport } from '../analytics/profit';
import { SHOP_TZ } from '../analytics/queries';
import { audit, type Actor } from '../audit';
import { db, type Db } from '../db';
import { DomainError } from '../errors';

const DEFAULT_CATEGORIES: { name: string; plLine: PlLine }[] = [
	{ name: 'Insumos e embalagens', plLine: 'cmv' },
	{ name: 'Salários e encargos', plLine: 'pessoal' },
	{ name: 'Aluguel e condomínio', plLine: 'ocupacao' },
	{ name: 'Energia, água e gás', plLine: 'ocupacao' },
	{ name: 'Marketing', plLine: 'marketing' },
	{ name: 'Tarifas bancárias e sistemas', plLine: 'taxas' },
	{ name: 'Impostos e contador', plLine: 'impostos' },
	{ name: 'Outros', plLine: 'outros' }
];

export interface Category {
	id: string;
	name: string;
	plLine: PlLine;
}

export async function categories(sql: Db = db()): Promise<Category[]> {
	let rows = await sql<Category[]>`
		select id, name, pl_line as "plLine" from expense_categories where active order by name`;
	if (rows.length === 0) {
		for (const c of DEFAULT_CATEGORIES)
			await sql`insert into expense_categories (name, pl_line) values (${c.name}, ${c.plLine})
				on conflict do nothing`;
		rows = await sql<Category[]>`
			select id, name, pl_line as "plLine" from expense_categories where active order by name`;
	}
	return rows;
}

const MONTH_RE = /^\d{4}-\d{2}$/;
export const monthOf = (d: Date | string = new Date()) =>
	new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TZ, year: 'numeric', month: '2-digit' })
		.format(typeof d === 'string' ? new Date(d) : d)
		.slice(0, 7);

export function validMonth(m: string | null | undefined): string {
	return m && MONTH_RE.test(m) ? m : monthOf();
}

export interface ExpenseInput {
	categoryId: string;
	description: string;
	amountCents: number;
	/** "YYYY-MM". */
	month: string;
	paidAt?: string | null;
}

function check(i: { description: string; amountCents: number }) {
	if (!i.description.trim() || i.description.trim().length > 120)
		throw new DomainError('err.expense.description');
	if (!Number.isInteger(i.amountCents) || i.amountCents <= 0)
		throw new DomainError('err.expense.amount');
}

export async function addExpense(i: ExpenseInput, actor: Actor) {
	check(i);
	if (!MONTH_RE.test(i.month)) throw new DomainError('err.expense.month');
	return db().begin(async (tx) => {
		const [e] = await tx<{ id: string }[]>`
			insert into expenses (category_id, description, amount_cents, competence_month, paid_at, created_by)
			values (${i.categoryId}, ${i.description.trim()}, ${i.amountCents}, ${`${i.month}-01`},
				${i.paidAt || null}, ${actor.id}) returning id`;
		await audit(tx, actor, 'expense.added', 'expense', e.id, { amountCents: i.amountCents });
		return e.id;
	});
}

export async function deleteExpense(id: string, actor: Actor) {
	await db().begin(async (tx) => {
		const [e] = await tx<{ id: string }[]>`delete from expenses where id = ${id} returning id`;
		if (e) await audit(tx, actor, 'expense.deleted', 'expense', id, {});
	});
}

export async function listExpenses(month: string) {
	return db()<
		{
			id: string;
			category: string;
			plLine: PlLine;
			description: string;
			amountCents: number;
			paidAt: Date | null;
			recurring: boolean;
		}[]
	>`
		select e.id, c.name as category, c.pl_line as "plLine", e.description,
			e.amount_cents as "amountCents", e.paid_at as "paidAt", e.recurring_id is not null as recurring
		from expenses e join expense_categories c on c.id = e.category_id
		where e.competence_month = ${`${month}-01`} order by c.name, e.created_at`;
}

export interface RecurringInput {
	categoryId: string;
	description: string;
	amountCents: number;
	dayOfMonth: number;
}

export async function addRecurring(i: RecurringInput, actor: Actor) {
	check(i);
	if (!Number.isInteger(i.dayOfMonth) || i.dayOfMonth < 1 || i.dayOfMonth > 28)
		throw new DomainError('err.expense.day');
	return db().begin(async (tx) => {
		const [r] = await tx<{ id: string }[]>`
			insert into recurring_expenses (category_id, description, amount_cents, day_of_month)
			values (${i.categoryId}, ${i.description.trim()}, ${i.amountCents}, ${i.dayOfMonth})
			returning id`;
		await audit(tx, actor, 'expense.recurring_added', 'recurring_expense', r.id, {});
		return r.id;
	});
}

export async function setRecurringActive(id: string, active: boolean, actor: Actor) {
	await db().begin(async (tx) => {
		await tx`update recurring_expenses set active = ${active} where id = ${id}`;
		await audit(tx, actor, 'expense.recurring_toggled', 'recurring_expense', id, { active });
	});
}

export async function listRecurring() {
	return db()<
		{
			id: string;
			category: string;
			description: string;
			amountCents: number;
			dayOfMonth: number;
			active: boolean;
		}[]
	>`
		select r.id, c.name as category, r.description, r.amount_cents as "amountCents",
			r.day_of_month as "dayOfMonth", r.active
		from recurring_expenses r join expense_categories c on c.id = r.category_id
		order by r.active desc, r.day_of_month`;
}

/** Daily job: enters each active recurring expense for this month once its day has come. */
export async function enterRecurringExpenses(now = new Date()) {
	const today = new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TZ }).format(now);
	const rows = await db()<{ id: string }[]>`
		insert into expenses (category_id, description, amount_cents, competence_month, recurring_id)
		select r.category_id, r.description, r.amount_cents, ${`${today.slice(0, 7)}-01`}::date, r.id
		from recurring_expenses r
		where r.active and r.day_of_month <= ${Number(today.slice(8, 10))}
		on conflict (recurring_id, competence_month) where recurring_id is not null do nothing
		returning id`;
	return rows.length;
}

const lastDay = (month: string) => {
	const [y, m] = month.split('-').map(Number);
	return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

/**
 * The month's result. Food cost is "real" when the month has a stock count (what left stock:
 * sales, waste and count adjustments), else the fichas técnicas ("theoretical").
 */
export async function monthlyResult(month: string) {
	const sql = db();
	const range = { from: `${month}-01`, to: lastDay(month) };
	const profit = await profitReport(range);
	const [counted] = await sql<{ counted: boolean; micro: number }[]>`
		select bool_or(kind = 'count_adjust') as counted,
			coalesce(sum(-qty_base * unit_cost_micro) filter (where kind in ('sale', 'sale_reversal', 'waste', 'count_adjust')), 0)::float8 as micro
		from stock_movements
		where created_at >= (${range.from}::timestamp at time zone ${SHOP_TZ})
			and created_at < ((${range.to}::timestamp + interval '1 day') at time zone ${SHOP_TZ})`;
	const real = !!counted?.counted;
	const foodCostCents = real ? Math.round(counted.micro / 1_000_000) : profit.total.foodCostCents;
	const byLine = await sql<{ pl_line: PlLine; cents: number }[]>`
		select c.pl_line, sum(e.amount_cents)::int as cents
		from expenses e join expense_categories c on c.id = e.category_id
		where e.competence_month = ${range.from} group by c.pl_line`;
	const expenses = Object.fromEntries(byLine.map((r) => [r.pl_line, r.cents])) as Partial<
		Record<PlLine, number>
	>;
	const dre = buildDre({
		grossCents: profit.total.grossCents,
		discountCents: profit.total.discountCents,
		simplesRateBps: profit.settings.simplesRateBps,
		foodCostCents,
		commissionsCents: profit.total.commissionCents,
		paymentFeesCents: profit.total.feesCents,
		deliveryCostCents: profit.total.deliveryCostCents,
		expenses
	});
	return {
		month,
		range,
		...dre,
		foodCostKind: real ? ('real' as const) : ('theoretical' as const),
		withoutRecipe: real ? 0 : profit.total.withoutRecipe,
		simplesRateBps: profit.settings.simplesRateBps,
		orders: profit.total.orders,
		lines: dre.lines,
		plLines: PL_LINES
	};
}

export async function saveSimplesRate(bps: number, actor: Actor) {
	if (!Number.isInteger(bps) || bps < 0 || bps > 3000) throw new DomainError('err.profit.settings');
	await db().begin(async (tx) => {
		await tx`update store_runtime_settings set simples_rate_bps = ${bps} where shop_id = current_shop_id()`;
		await audit(tx, actor, 'profit.simples_saved', 'store_runtime_settings', '1', { bps });
	});
}
