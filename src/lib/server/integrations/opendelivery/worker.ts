// Registers Open Delivery jobs with the worker. Each shop polls only the partners it turned
// on (re-read on every tick), one worker instance per shop and partner at a time.
import { db, withShop } from '../../db';
import { QUEUES } from '../../jobs';
import { activeShopIds } from '../../worker/handlers';
import type { OrderStatus } from '#lib/domain/order-status.ts';
import { pollOdOnce, processStoredOdEvent, syncOrderToOd } from './service';
import { enabledOdPartners, recordOdPoll } from './settings';
import type { OdPartner } from './mapping';

const POLL_MS = 30_000;

export async function odHandlers() {
	const handlers = {
		[QUEUES.odEvent]: (d: { channelEventId: string }) => processStoredOdEvent(d.channelEventId),
		[QUEUES.odSync]: (d: { orderId: string; to: OrderStatus; reason?: string }) => syncOrderToOd(d)
	};
	let running = false;
	const tick = async () => {
		if (running) return;
		running = true;
		try {
			for (const shopId of await activeShopIds()) {
				await withShop(shopId, async () => {
					for (const partner of await enabledOdPartners().catch(() => [])) {
						await pollPartner(shopId, partner);
					}
				});
			}
		} finally {
			running = false;
		}
	};
	const pollPartner = async (shopId: string, partner: OdPartner) => {
		const key = `opendelivery:${partner}:${shopId}`;
		try {
			const reserved = await db().reserve();
			try {
				const [{ locked }] = await reserved<
					{ locked: boolean }[]
				>`select pg_try_advisory_lock(hashtext(${key})) as locked`;
				if (!locked) return;
				try {
					const r = await pollOdOnce(partner);
					await recordOdPoll(partner, true);
					if (r.received) console.log(JSON.stringify({ msg: 'opendelivery poll', partner, ...r }));
				} catch (err) {
					await recordOdPoll(partner, false, String(err).slice(0, 300)).catch(() => {});
					throw err;
				} finally {
					await reserved`select pg_advisory_unlock(hashtext(${key}))`;
				}
			} finally {
				reserved.release();
			}
		} catch (err) {
			console.error(
				JSON.stringify({ msg: 'opendelivery poll failed', shopId, partner, err: String(err) })
			);
		}
	};
	setInterval(tick, POLL_MS).unref();
	void tick();
	return handlers as Record<string, (d: never) => Promise<unknown>>;
}
