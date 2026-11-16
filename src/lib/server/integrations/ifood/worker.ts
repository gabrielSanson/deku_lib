// Registers iFood jobs with the worker. Polling runs only while iFood is turned
// on (in the setup wizard or with IFOOD_ENABLED); the setting is re-read on every
// tick, so no restart is needed. Each poll's outcome is recorded for the alerts.
import { beat } from '../../alerts/service';
import { db, withShop } from '../../db';
import { activeShopIds } from '../../worker/handlers';
import { QUEUES } from '../../jobs';
import { explainIfoodError } from './check';
import { runAvailability, runMenuSync } from '../menu-sync';
import { ifoodAdapter } from './adapter';
import { pollIfoodOnce, processIfoodEvent, syncOrderToIfood } from './service';
import { ifoodSettings, recordIfoodPoll } from './settings';

const POLL_MS = 30_000;
// Only one worker instance polls a shop at a time (lock per shop).

export async function ifoodHandlers() {
	const handlers = {
		[QUEUES.ifoodEvent]: (d: { channelEventId: string }) => processIfoodEvent(d.channelEventId),
		// While iFood is off, sync jobs are recorded as skipped and iFood is never called.
		[QUEUES.ifoodSync]: (d: { orderId: string; to: never; reason?: string }) => syncOrderToIfood(d),
		[QUEUES.ifoodMenuSync]: () => runMenuSync(ifoodAdapter()),
		[QUEUES.channelAvailability]: (d: { channel: string; skus: string[]; available: boolean }) =>
			d.channel === 'ifood' ? runAvailability(ifoodAdapter(), d) : Promise.resolve('skipped')
	};
	let running = false;
	const tick = async () => {
		if (running) return;
		running = true;
		try {
			for (const shopId of await activeShopIds()) {
				await withShop(shopId, () => pollShop(shopId));
			}
		} finally {
			running = false;
		}
	};
	const pollShop = async (shopId: string) => {
		try {
			if (!(await ifoodSettings()).enabled) return;
			const sql = db();
			const reserved = await sql.reserve();
			try {
				const [{ locked }] = await reserved<
					{ locked: boolean }[]
				>`select pg_try_advisory_lock(hashtext(${'ifood:' + shopId})) as locked`;
				if (!locked) return;
				try {
					const r = await pollIfoodOnce();
					await recordIfoodPoll(true);
					await beat('ifood-poll');
					if (r.received) console.log(JSON.stringify({ msg: 'ifood poll', ...r }));
				} catch (err) {
					const problem = explainIfoodError(err, 'polling');
					await recordIfoodPoll(false, `${problem.title} ${problem.action}`).catch(() => {});
					throw err;
				} finally {
					await reserved`select pg_advisory_unlock(hashtext(${'ifood:' + shopId}))`;
				}
			} finally {
				reserved.release();
			}
		} catch (err) {
			console.error(JSON.stringify({ msg: 'ifood poll failed', shopId, err: String(err) }));
		}
	};
	setInterval(tick, POLL_MS).unref();
	void tick();
	return handlers as Record<string, (d: never) => Promise<unknown>>;
}
