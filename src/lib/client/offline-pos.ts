// Offline POS (S5.10): sales made without internet wait in IndexedDB on this device until they are
// sent to /staff/pos/sync. Each has its own idempotency key, so a resend never doubles an order.

export interface QueuedSale {
	key: string;
	number: string;
	createdAt: string;
	catalogVersion: string | null;
	lines: unknown[];
	fulfillmentType: 'dine_in' | 'pickup';
	customerLabel?: string;
	tableLabel?: string;
	notes?: string;
	discountCents: number;
	totalCents: number;
	tender: { method: 'cash' | 'terminal_card'; receivedCents?: number };
	/** Set when the server could not take it; staff resolve it by hand. */
	problem?: { error: string; orderId: string | null };
}

const DB = 'pos-offline';
const STORE = 'sales';
const COUNTER = 'pos-offline-number';

function open(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB, 1);
		req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
	const db = await open();
	try {
		return await new Promise<T>((resolve, reject) => {
			const tx = db.transaction(STORE, mode);
			const req = fn(tx.objectStore(STORE));
			tx.oncomplete = () => resolve(req.result);
			tx.onerror = () => reject(tx.error);
		});
	} finally {
		db.close();
	}
}

export const queuedSales = async (): Promise<QueuedSale[]> =>
	(await run<QueuedSale[]>('readonly', (s) => s.getAll())).sort((a, b) =>
		a.createdAt.localeCompare(b.createdAt)
	);

export const putSale = (sale: QueuedSale) => run('readwrite', (s) => s.put(sale));

export const removeSale = (key: string) => run('readwrite', (s) => s.delete(key));

/** The next temporary number on this device: OFF-1, OFF-2, … */
export function nextOfflineNumber(): string {
	try {
		const n = (Number(localStorage.getItem(COUNTER) ?? '0') || 0) + 1;
		localStorage.setItem(COUNTER, String(n));
		return `OFF-${n}`;
	} catch {
		return `OFF-${(Math.floor(Date.now() / 1000) % 100_000) + 1}`;
	}
}

export type SyncResult =
	| { key: string; status: 'synced'; orderId: string }
	| { key: string; status: 'conflict'; orderId: string | null; error: string };

/** Sends every sale still waiting. Synced ones leave the queue; conflicts stay, marked. */
export async function syncQueuedSales(): Promise<{ synced: number; conflicts: number } | null> {
	const pending = (await queuedSales()).filter((s) => !s.problem);
	if (!pending.length) return { synced: 0, conflicts: 0 };
	let res: Response;
	try {
		res = await fetch('/staff/pos/sync', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				orders: pending.map((s) => ({ ...s, problem: undefined }))
			})
		});
	} catch {
		return null;
	}
	if (!res.ok) return null;
	const { results } = (await res.json()) as { results: SyncResult[] };
	let synced = 0;
	let conflicts = 0;
	for (const r of results) {
		if (r.status === 'synced') {
			await removeSale(r.key);
			synced++;
		} else {
			const sale = pending.find((s) => s.key === r.key);
			if (sale) await putSale({ ...sale, problem: { error: r.error, orderId: r.orderId } });
			conflicts++;
		}
	}
	return { synced, conflicts };
}
