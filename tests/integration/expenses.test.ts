// S4.4: expenses by category, fixed expenses entered once a month, and the monthly result.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import {
	addExpense,
	addRecurring,
	categories,
	enterRecurringExpenses,
	listExpenses,
	monthOf,
	monthlyResult,
	saveSimplesRate
} from '#lib/server/expenses/service.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { makeStaff } from './helpers.ts';

let manager: Awaited<ReturnType<typeof makeStaff>>;
const month = monthOf();

beforeAll(async () => {
	manager = await makeStaff('admin');
});

afterAll(async () => {
	await db()`delete from expenses`;
	await db()`delete from recurring_expenses`;
	await saveSimplesRate(0, manager);
	await stopBoss();
	await closeDb();
});

describe('expenses and monthly result', () => {
	it('seeds categories and records expenses for the month', async () => {
		const cats = await categories();
		expect(cats.length).toBeGreaterThanOrEqual(8);
		const rent = cats.find((c) => c.plLine === 'ocupacao')!;
		await addExpense(
			{ categoryId: rent.id, description: 'Aluguel', amountCents: 300_000, month },
			manager
		);
		await expect(
			addExpense({ categoryId: rent.id, description: 'x', amountCents: 0, month }, manager)
		).rejects.toThrow();
		expect((await listExpenses(month)).map((e) => e.description)).toContain('Aluguel');
	});

	it('enters a fixed expense once per month on or after its day', async () => {
		const staff = (await categories()).find((c) => c.plLine === 'pessoal')!;
		await addRecurring(
			{ categoryId: staff.id, description: 'Salário', amountCents: 200_000, dayOfMonth: 1 },
			manager
		);
		expect(await enterRecurringExpenses()).toBe(1);
		expect(await enterRecurringExpenses()).toBe(0);
		expect((await listExpenses(month)).filter((e) => e.recurring)).toHaveLength(1);
	});

	it('builds the result with taxes and expense lines', async () => {
		await saveSimplesRate(600, manager);
		const r = await monthlyResult(month);
		const line = (k: string) => r.lines.find((l) => l.key === k)!.cents;
		expect(line('exp.ocupacao')).toBe(-300_000);
		expect(line('exp.pessoal')).toBe(-200_000);
		const sales = line('gross') + line('discounts');
		expect(line('taxes')).toBe(0 - Math.round((sales * 600) / 10_000));
		expect(r.resultCents).toBe(line('result'));
		expect(r.lines.filter((l) => !l.total).reduce((n, l) => n + l.cents, 0)).toBe(r.resultCents);
	});
});
