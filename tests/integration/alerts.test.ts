import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { evaluateAlerts, openAlerts, saveAlertSettings } from '#lib/server/alerts/service.ts';
import type { AlertMessage, Notifier } from '#lib/server/alerts/notify.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { handleHeartbeat } from '#lib/server/worker/handlers.ts';

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

function fakeNotifier() {
	const sent: AlertMessage[] = [];
	const notifier: Notifier = {
		async send(m) {
			sent.push(m);
			return { email: 0, push: 0 };
		}
	};
	return { sent, notifier };
}

const at = (base: Date, minutes: number) => new Date(base.getTime() + minutes * 60_000);

beforeEach(async () => {
	await db()`delete from alerts`;
	await db()`delete from system_heartbeats`;
	await db()`delete from backup_runs`;
	await db()`update store_runtime_settings set accepting_orders = true, hours_enabled = false`;
	await saveAlertSettings({
		emailTo: [],
		pushEnabled: true,
		noOrdersEnabled: false,
		noOrdersMinutes: 60
	});
});

describe('worker alerts', () => {
	it('opens once when the worker stops, repeats every 30 minutes and resolves on restart', async () => {
		const { sent, notifier } = fakeNotifier();
		await handleHeartbeat();
		const t0 = new Date();
		expect((await evaluateAlerts(t0, notifier)).opened).toEqual([]);

		// Four minutes without a beat.
		let r = await evaluateAlerts(at(t0, 4), notifier);
		expect(r.opened).toEqual(['worker_down']);
		expect((await evaluateAlerts(at(t0, 5), notifier)).opened).toEqual([]);
		expect((await evaluateAlerts(at(t0, 20), notifier)).repeated).toEqual([]);
		r = await evaluateAlerts(at(t0, 35), notifier);
		expect(r.repeated).toEqual(['worker_down']);
		expect((await openAlerts()).map((a) => a.kind)).toEqual(['worker_down']);

		await db()`update system_heartbeats set beat_at = ${at(t0, 36)} where name = 'worker'`;
		r = await evaluateAlerts(at(t0, 36), notifier);
		expect(r.resolved).toEqual(['worker_down']);
		expect(sent.map((m) => `${m.kind}:${m.state}`)).toEqual([
			'worker_down:open',
			'worker_down:repeat',
			'worker_down:resolved'
		]);
		expect(await openAlerts()).toEqual([]);
	});

	it('gives a worker that never started three minutes after the watchdog starts', async () => {
		const { notifier } = fakeNotifier();
		const started = new Date();
		const quiet = await evaluateAlerts(at(started, 2), notifier, { watchdogStartedAt: started });
		expect(quiet.opened).toEqual([]);
		const loud = await evaluateAlerts(at(started, 4), notifier, { watchdogStartedAt: started });
		expect(loud.opened).toEqual(['worker_down']);
	});

	it('keeps going when a notification fails', async () => {
		const broken: Notifier = {
			send: async () => {
				throw new Error('smtp down');
			}
		};
		const err = console.error;
		console.error = () => {};
		const r = await evaluateAlerts(at(new Date(), 10), broken);
		console.error = err;
		expect(r.opened).toContain('worker_down');
	});
});

describe('backup alerts', () => {
	it('stay quiet until the backup service has run, then flag a stale dump', async () => {
		const { notifier } = fakeNotifier();
		await handleHeartbeat();
		const now = new Date();
		expect((await evaluateAlerts(now, notifier)).opened).toEqual([]);
		await db()`insert into backup_runs (kind, started_at, ok) values ('dump', now() - interval '30 hours', true)`;
		expect((await evaluateAlerts(now, notifier)).opened).toEqual(['backup_stale']);
		await db()`insert into backup_runs (kind, ok) values ('dump', true)`;
		expect((await evaluateAlerts(now, notifier)).resolved).toEqual(['backup_stale']);
	});
});

describe('no-orders alert', () => {
	async function historyAt(when: Date, perWeek: number) {
		for (let w = 1; w <= 4; w++)
			for (let i = 0; i < perWeek; i++)
				await db()`
					insert into orders (channel, source_mode, status, payment_status, fulfillment_type,
						subtotal_cents, total_cents, catalog_version, idempotency_key, payment_plan, created_at)
					values ('web', 'web', 'completed', 'paid', 'pickup', 1000, 1000, 1, ${randomUUID()},
						'pix_key', ${new Date(when.getTime() - w * 7 * 86400_000)})`;
	}

	it('fires on a normally busy hour with nothing for an hour, and not on a quiet hour', async () => {
		const { notifier } = fakeNotifier();
		await saveAlertSettings({
			emailTo: [],
			pushEnabled: true,
			noOrdersEnabled: true,
			noOrdersMinutes: 60
		});
		// A moment far from any other test's orders, at the same hour each week.
		const busy = new Date('2027-03-03T22:30:00Z');
		await db()`insert into system_heartbeats (name, beat_at) values ('worker', ${busy})`;
		expect((await evaluateAlerts(busy, notifier)).opened).not.toContain('no_orders');
		await historyAt(busy, 3);
		expect((await evaluateAlerts(busy, notifier)).opened).toContain('no_orders');

		// The same moment with the store paused: resolved.
		await db()`update store_runtime_settings set accepting_orders = false`;
		expect((await evaluateAlerts(busy, notifier)).resolved).toContain('no_orders');
		await db()`delete from orders where created_at > now() + interval '30 days'`;
		await db()`update store_runtime_settings set accepting_orders = true`;
	});
});
