// Registers iFood jobs with the worker when IFOOD_ENABLED is on.
import { config } from '../../config';
import { db } from '../../db';
import { QUEUES } from '../../jobs';
import { pollIfoodOnce, processIfoodEvent, syncOrderToIfood } from './service';

const POLL_MS = 30_000;
// Only one worker instance polls at a time.
const POLL_LOCK = 724_001;

export async function ifoodHandlers() {
	const c = config();
	const handlers = {
		[QUEUES.ifoodEvent]: (d: { channelEventId: string }) => processIfoodEvent(d.channelEventId),
		[QUEUES.ifoodSync]: (d: { orderId: string; to: never; reason?: string }) => syncOrderToIfood(d)
	};
	if (!c.IFOOD_ENABLED) {
		// Still drain sync jobs so they are recorded as skipped, but never call iFood.
		return { [QUEUES.ifoodSync]: handlers[QUEUES.ifoodSync] } as Record<
			string,
			(d: never) => Promise<unknown>
		>;
	}
	let running = false;
	const tick = async () => {
		if (running) return;
		running = true;
		try {
			const sql = db();
			const reserved = await sql.reserve();
			try {
				const [{ locked }] = await reserved<
					{ locked: boolean }[]
				>`select pg_try_advisory_lock(${POLL_LOCK}) as locked`;
				if (!locked) return;
				try {
					const r = await pollIfoodOnce();
					if (r.received) console.log(JSON.stringify({ msg: 'ifood poll', ...r }));
				} finally {
					await reserved`select pg_advisory_unlock(${POLL_LOCK})`;
				}
			} finally {
				reserved.release();
			}
		} catch (err) {
			console.error(JSON.stringify({ msg: 'ifood poll failed', err: String(err) }));
		} finally {
			running = false;
		}
	};
	setInterval(tick, POLL_MS).unref();
	void tick();
	return handlers as Record<string, (d: never) => Promise<unknown>>;
}
