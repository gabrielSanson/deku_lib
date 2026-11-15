// Watchdog process: `node --import tsx scripts/watchdog.ts` (compose service shop-watchdog).
// Every minute it checks the worker, iFood, backups and orders and alerts the owner. It runs
// apart from the worker so that a dead worker is still reported.
import { beat, evaluateAlerts } from '#lib/server/alerts/service.ts';
import { closeDb } from '#lib/server/db.ts';

const startedAt = new Date();
const EVERY_MS = 60_000;

async function tick() {
	try {
		const r = await evaluateAlerts(new Date(), undefined, { watchdogStartedAt: startedAt });
		await beat('watchdog');
		if (r.opened.length || r.resolved.length) console.log(JSON.stringify({ msg: 'alerts', ...r }));
	} catch (err) {
		console.error(JSON.stringify({ msg: 'watchdog tick failed', err: String(err) }));
	}
}

console.log(JSON.stringify({ msg: 'watchdog started' }));
await tick();
const timer = setInterval(tick, EVERY_MS);

async function shutdown(signal: string) {
	clearInterval(timer);
	console.log(JSON.stringify({ msg: 'watchdog stopping', signal }));
	await closeDb();
	process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
