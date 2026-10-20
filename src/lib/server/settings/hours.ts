// Opening hours and closed dates. Read on every order and every storefront
// page, so cached briefly; saving drops the cache.
import { z } from 'zod';
import { isOpenAt, isTime, type Schedule } from '#lib/domain/hours.ts';
import { audit, type Actor } from '../audit';
import { db, type Db } from '../db';

const TTL_MS = 10_000;
let cache: { value: Schedule; at: number } | undefined;

export async function getSchedule(sql: Db = db(), { fresh = false } = {}): Promise<Schedule> {
	if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache.value;
	const [[settings], days, closures] = await Promise.all([
		sql<
			{ hours_enabled: boolean }[]
		>`select hours_enabled from store_runtime_settings where id = 1`,
		sql<{ weekday: number; opens: string; closes: string }[]>`
			select weekday, to_char(opens, 'HH24:MI') as opens, to_char(closes, 'HH24:MI') as closes
			from store_hours order by weekday, opens`,
		sql<{ day: string }[]>`
			select to_char(day, 'YYYY-MM-DD') as day from store_closures
			where day >= current_date - 1 order by day`
	]);
	const value: Schedule = {
		enabled: settings.hours_enabled,
		days,
		closedDates: closures.map((c) => c.day)
	};
	cache = { value, at: Date.now() };
	return value;
}

export async function inHoursNow(sql: Db = db(), now = new Date()) {
	return isOpenAt(await getSchedule(sql), now);
}

const time = z.string().refine(isTime, 'Horário inválido. Use HH:MM.');

export const scheduleInput = z.object({
	enabled: z.boolean(),
	days: z
		.array(z.object({ weekday: z.number().int().min(0).max(6), opens: time, closes: time }))
		.max(28),
	closures: z
		.array(
			z.object({
				day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
				reason: z.string().trim().max(80).optional()
			})
		)
		.max(60)
});

export async function saveSchedule(input: z.input<typeof scheduleInput>, actor: Actor) {
	const s = scheduleInput.parse(input);
	await db().begin(async (tx) => {
		await tx`update store_runtime_settings set hours_enabled = ${s.enabled}, updated_by = ${actor.id},
			updated_at = now(), version = version + 1 where id = 1`;
		await tx`delete from store_hours`;
		for (const d of s.days) {
			await tx`insert into store_hours (weekday, opens, closes) values (${d.weekday}, ${d.opens}, ${d.closes})`;
		}
		await tx`delete from store_closures`;
		for (const c of s.closures) {
			await tx`insert into store_closures (day, reason) values (${c.day}, ${c.reason || null})
				on conflict (day) do nothing`;
		}
		await audit(tx, actor, 'store.hours_updated', 'store_hours', '1', s);
	});
	cache = undefined;
}

export async function listClosures(sql: Db = db()) {
	return sql<{ day: string; reason: string | null }[]>`
		select to_char(day, 'YYYY-MM-DD') as day, reason from store_closures
		where day >= current_date order by day`;
}
