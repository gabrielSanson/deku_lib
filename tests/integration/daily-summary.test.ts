// S4.5: the owner's summary goes out once, 30 min after closing (23:30 without opening hours).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { shopTime } from '#lib/domain/hours.ts';
import {
	buildDailySummary,
	dailySummaryTick,
	summaryText
} from '#lib/server/alerts/daily-summary.ts';
import { getAlertSettings, saveAlertSettings } from '#lib/server/alerts/service.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { getSchedule } from '#lib/server/settings/hours.ts';
import { getTexts } from '#lib/server/settings/texts.ts';

const day = '2026-11-10';
let before: Awaited<ReturnType<typeof getAlertSettings>>;

beforeAll(async () => {
	before = await getAlertSettings();
	await saveAlertSettings({ ...before, emailTo: ['dono@resumo.test'], dailySummaryEnabled: true });
	expect((await getSchedule(db(), { fresh: true })).enabled).toBe(false);
});

afterAll(async () => {
	await saveAlertSettings(before);
	await db()`delete from daily_summaries`;
	await stopBoss();
	await closeDb();
});

describe('daily summary', () => {
	it('waits for 23:30, sends once, and never sends a stale day', async () => {
		expect(await dailySummaryTick(shopTime(day, '22:00'))).toBe('not-due');
		expect(await dailySummaryTick(shopTime(day, '23:40'))).toBe('sent');
		expect(await dailySummaryTick(shopTime(day, '23:55'))).toBe('already');
		const mails = await db()<{ vars: { subject: string } }[]>`
			select vars from message_outbox where to_address = 'dono@resumo.test'`;
		expect(mails).toHaveLength(1);
		expect(mails[0].vars.subject).toContain('10/11/2026');
		// The worker was down all night: the old day is skipped.
		expect(await dailySummaryTick(shopTime('2026-11-12', '09:00'))).toBe('not-due');
	});

	it('is off when the owner turns it off', async () => {
		await saveAlertSettings({
			...before,
			emailTo: ['dono@resumo.test'],
			dailySummaryEnabled: false
		});
		expect(await dailySummaryTick(shopTime('2026-11-11', '23:40'))).toBe('off');
	});

	it('writes the figures in the owner texts', async () => {
		const s = await buildDailySummary(day, shopTime(day, '23:30'));
		const text = summaryText(
			{
				...s,
				grossCents: 12_345,
				orders: 3,
				averageCents: 4_115,
				top: [{ name: 'X-Burger', units: 5 }]
			},
			await getTexts(),
			'Loja'
		);
		expect(text.body).toContain('3 pedidos');
		expect(text.body).toContain('X-Burger (5)');
	});
});
