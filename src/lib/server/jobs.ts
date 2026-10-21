// Durable background jobs on pg-boss. Jobs that must follow a data change are
// inserted through the same transaction (pg-boss `db` option), so a committed
// order always has its follow-up job and a rolled-back one never does.
// pg-boss delivers at least once: every handler must be idempotent.
import { PgBoss } from 'pg-boss';
import { config } from './config';
import type { Db } from './db';

export const QUEUES = {
	orderPlaced: 'order-placed',
	orderReady: 'order-ready',
	staleOrders: 'stale-orders',
	ifoodPoll: 'ifood-poll',
	ifoodEvent: 'ifood-event',
	ifoodSync: 'ifood-sync',
	paymentEvent: 'payment-event'
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

let boss: PgBoss | undefined;
let starting: Promise<PgBoss> | undefined;

export async function getBoss(): Promise<PgBoss> {
	if (boss) return boss;
	starting ??= (async () => {
		const instance = new PgBoss({ connectionString: config().DATABASE_URL, schema: 'pgboss' });
		instance.on('error', (err) =>
			console.error(JSON.stringify({ msg: 'pg-boss error', err: String(err) }))
		);
		await instance.start();
		for (const name of Object.values(QUEUES)) {
			await instance.createQueue(name, { retryLimit: 8, retryBackoff: true, retryDelay: 5 });
		}
		boss = instance;
		return instance;
	})();
	return starting;
}

export async function stopBoss() {
	await boss?.stop({ graceful: true });
	boss = undefined;
	starting = undefined;
}

/** Enqueue a job inside the caller's transaction. */
export async function enqueue(
	tx: Db,
	name: QueueName,
	data: Record<string, unknown>,
	options: { singletonKey?: string; startAfter?: number } = {}
) {
	const instance = await getBoss();
	await instance.send(name, data, {
		...options,
		db: {
			executeSql: async (text: string, values?: unknown[]) => ({
				rows: await tx.unsafe(text, (values ?? []) as never[])
			})
		}
	});
}
