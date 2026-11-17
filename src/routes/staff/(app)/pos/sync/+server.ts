// Offline POS (S5.10): the counter posts the sales it queued while offline.
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { staffActor } from '#lib/server/auth/staff.ts';
import { offlineOrder, syncOfflineOrders } from '#lib/server/pos/offline-sync.ts';
import type { RequestHandler } from './$types';

const body = z.object({ orders: z.array(offlineOrder).min(1).max(100) });

export const POST: RequestHandler = async (event) => {
	const staff = requirePermission(event, 'pos.sell');
	const parsed = body.safeParse(await event.request.json().catch(() => null));
	if (!parsed.success) return json({ error: 'invalid' }, { status: 400 });
	return json({ results: await syncOfflineOrders(parsed.data.orders, staffActor(staff)) });
};
