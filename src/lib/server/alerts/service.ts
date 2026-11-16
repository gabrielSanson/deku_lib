// The watchdog's brain: look at heartbeats, backups and orders, open one alert per problem,
// repeat it every 30 minutes while it lasts and say when it is over. Runs in scripts/watchdog.ts,
// apart from the worker, so a dead worker is still reported.
import {
	alertDue,
	backupStale,
	ifoodPollStale,
	noOrdersSuspicious,
	workerDown
} from '#lib/domain/health.ts';
import { isOpenAt } from '#lib/domain/hours.ts';
import { SHOP_TZ } from '#lib/domain/time.ts';
import { db, type Db } from '../db';
import { ifoodStatus } from '../integrations/ifood/settings';
import { getSchedule } from '../settings/hours';
import { getStoreSettings } from '../settings/service';
import { defaultNotifier, type Notifier } from './notify';

export const ALERT_KINDS = [
	'worker_down',
	'no_orders',
	'ifood_poll',
	'backup_stale',
	'fiscal_errors',
	'disk'
] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export async function beat(name: string, detail: Record<string, unknown> = {}, sql: Db = db()) {
	await sql`
		insert into system_heartbeats (name, beat_at, detail) values (${name}, now(), ${sql.json(detail as never)})
		on conflict (name) do update set beat_at = now(), detail = excluded.detail`;
}

export interface AlertSettings {
	emailTo: string[];
	pushEnabled: boolean;
	noOrdersEnabled: boolean;
	noOrdersMinutes: number;
}

export async function getAlertSettings(sql: Db = db()): Promise<AlertSettings> {
	const [r] = await sql<
		{
			email_to: string[];
			push_enabled: boolean;
			no_orders_enabled: boolean;
			no_orders_minutes: number;
		}[]
	>`select * from alert_settings where shop_id = current_shop_id()`;
	return {
		emailTo: r.email_to,
		pushEnabled: r.push_enabled,
		noOrdersEnabled: r.no_orders_enabled,
		noOrdersMinutes: r.no_orders_minutes
	};
}

export async function saveAlertSettings(input: AlertSettings, sql: Db = db()) {
	await sql`
		update alert_settings set email_to = ${input.emailTo}, push_enabled = ${input.pushEnabled},
			no_orders_enabled = ${input.noOrdersEnabled}, no_orders_minutes = ${input.noOrdersMinutes},
			updated_at = now()
		where shop_id = current_shop_id()`;
}

/** What is wrong right now, by kind, with the details the message needs. */
export async function currentProblems(
	now: Date,
	opts: { watchdogStartedAt?: Date } = {},
	sql: Db = db()
): Promise<Map<AlertKind, Record<string, unknown>>> {
	const problems = new Map<AlertKind, Record<string, unknown>>();
	const beats = await sql<{ name: string; beat_at: Date }[]>`
		select name, beat_at from system_heartbeats`;
	const beatOf = (name: string) => beats.find((b) => b.name === name)?.beat_at ?? null;

	// A fresh watchdog gives the worker three minutes to check in for the first time.
	const workerBeat = beatOf('worker') ?? opts.watchdogStartedAt ?? null;
	if (workerDown(workerBeat, now))
		problems.set('worker_down', { since: beatOf('worker')?.toISOString() ?? '' });

	const [settings, schedule, alertSettings] = await Promise.all([
		getStoreSettings(sql),
		getSchedule(sql, { fresh: true }),
		getAlertSettings(sql)
	]);
	const openNow = settings.acceptingOrders && isOpenAt(schedule, now);

	const ifood = await ifoodStatus();
	if (
		ifoodPollStale(ifood.lastPollOkAt ?? beatOf('ifood-poll'), now, {
			enabled: ifood.enabled,
			open: openNow
		})
	)
		problems.set('ifood_poll', { error: ifood.lastPollError ?? '' });

	// Only once the backup service has run at least once (it writes backup_runs).
	const [backups] = await sql<{ runs: number; last_ok: Date | null }[]>`
		select count(*)::int as runs, max(started_at) filter (where ok) as last_ok
		from backup_runs where kind = 'dump'`;
	if (backups.runs > 0 && backupStale(backups.last_ok, now))
		problems.set('backup_stale', { since: backups.last_ok?.toISOString() ?? '' });

	if (alertSettings.noOrdersEnabled) {
		const threshold = alertSettings.noOrdersMinutes;
		// Open for the whole window, so a shop that just opened is not flagged.
		const openAll = openNow && isOpenAt(schedule, new Date(now.getTime() - threshold * 60_000));
		const [o] = await sql<{ last: Date | null; expected: number }[]>`
			with local as (select (${now}::timestamptz at time zone ${SHOP_TZ}) as t)
			select
				(select max(created_at) from orders where is_test = false and created_at <= ${now}) as last,
				(select count(*)::float / 4 from orders, local
					where is_test = false
						and created_at >= ${now}::timestamptz - interval '28 days'
						and (created_at at time zone ${SHOP_TZ})::date < local.t::date
						and extract(isodow from created_at at time zone ${SHOP_TZ}) = extract(isodow from local.t)
						and extract(hour from created_at at time zone ${SHOP_TZ}) = extract(hour from local.t)
				) as expected`;
		const minutesSince = o.last ? (now.getTime() - new Date(o.last).getTime()) / 60_000 : null;
		if (
			noOrdersSuspicious({
				openNow: openAll,
				minutesSinceLastOrder: minutesSince,
				expectedPerHour: o.expected,
				thresholdMinutes: threshold
			})
		)
			problems.set('no_orders', { minutes: Math.floor(minutesSince ?? threshold) });
	}

	// Three or more notes failed in the last hour.
	const [fiscal] = await sql<{ failed: number }[]>`
		select count(*)::int as failed from fiscal_documents
		where status in ('rejected', 'error') and updated_at > ${now}::timestamptz - interval '1 hour'`;
	if (fiscal.failed >= 3) problems.set('fiscal_errors', { count: fiscal.failed });

	return problems;
}

export interface EvaluateResult {
	opened: AlertKind[];
	repeated: AlertKind[];
	resolved: AlertKind[];
}

/** Opens, repeats and resolves alerts. Notification failures are logged, never fatal. */
export async function evaluateAlerts(
	now = new Date(),
	notifier: Notifier = defaultNotifier,
	opts: { watchdogStartedAt?: Date } = {},
	sql: Db = db()
): Promise<EvaluateResult> {
	const problems = await currentProblems(now, opts, sql);
	const open = await sql<{ id: string; kind: AlertKind; last_notified_at: Date | null }[]>`
		select id, kind, last_notified_at from alerts where resolved_at is null`;
	const result: EvaluateResult = { opened: [], repeated: [], resolved: [] };
	const send = async (kind: AlertKind, state: 'open' | 'repeat' | 'resolved', detail: object) => {
		try {
			await notifier.send({ kind, state, detail: detail as Record<string, unknown> });
		} catch (err) {
			console.error(JSON.stringify({ msg: 'alert notify failed', kind, state, err: String(err) }));
		}
	};

	for (const kind of ALERT_KINDS) {
		const problem = problems.get(kind);
		const row = open.find((a) => a.kind === kind);
		if (problem && !row) {
			const inserted = await sql`
				insert into alerts (kind, opened_at, last_notified_at, detail)
				values (${kind}, ${now}, ${now}, ${sql.json(problem as never)})
				on conflict (shop_id, kind) where resolved_at is null do nothing
				returning id`;
			if (inserted.length) {
				result.opened.push(kind);
				await send(kind, 'open', problem);
			}
		} else if (problem && row) {
			if (alertDue(row.last_notified_at, now)) {
				await sql`update alerts set last_notified_at = ${now}, detail = ${sql.json(problem as never)}
					where id = ${row.id}`;
				result.repeated.push(kind);
				await send(kind, 'repeat', problem);
			}
		} else if (!problem && row) {
			await sql`update alerts set resolved_at = ${now} where id = ${row.id} and resolved_at is null`;
			result.resolved.push(kind);
			await send(kind, 'resolved', {});
		}
	}
	return result;
}

export interface OpenAlert {
	kind: AlertKind;
	openedAt: Date;
	detail: Record<string, unknown>;
}

export async function openAlerts(sql: Db = db()): Promise<OpenAlert[]> {
	const rows = await sql<{ kind: AlertKind; opened_at: Date; detail: Record<string, unknown> }[]>`
		select kind, opened_at, detail from alerts where resolved_at is null order by opened_at`;
	return rows.map((r) => ({ kind: r.kind, openedAt: r.opened_at, detail: r.detail }));
}

export async function saveStaffPushSubscription(
	staffId: string,
	sub: { endpoint: string; p256dh: string; auth: string },
	sql: Db = db()
) {
	await sql`
		insert into staff_push_subscriptions (staff_id, endpoint, p256dh, auth)
		values (${staffId}, ${sub.endpoint}, ${sub.p256dh}, ${sub.auth})
		on conflict (staff_id, endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth`;
}
