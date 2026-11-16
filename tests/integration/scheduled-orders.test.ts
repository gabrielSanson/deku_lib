// S3.8: an order for later. The customer picks a 15-minute slot; the kitchen sees the order only
// from the slot minus the prep time, and each slot takes at most the configured number of orders.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { slots } from '#lib/domain/hours.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { listKitchenOrders } from '#lib/server/orders/queries.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { getSchedule } from '#lib/server/settings/hours.ts';
import { getStoreSettings, updateStoreSettings } from '#lib/server/settings/service.ts';
import { classic, ensureCashOpen, makeStaff } from './helpers.ts';

let manager: Awaited<ReturnType<typeof makeStaff>>;

function webOrder(scheduledFor: Date | null) {
	return createOrder({
		channel: 'web',
		sourceMode: 'web',
		lines: [classic],
		fulfillmentType: 'pickup',
		customer: { name: 'Agendado', phoneE164: '+5511987650000' },
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		scheduledFor,
		actor: { type: 'customer', id: null }
	});
}

async function setScheduling(enabled: boolean, perSlot: number | null) {
	const s = await getStoreSettings();
	await updateStoreSettings(
		{
			acceptingOrders: true,
			webOrderingEnabled: true,
			pickupEnabled: true,
			maxOpenOrders: null,
			schedulingEnabled: enabled,
			maxOrdersPerSlot: perSlot
		},
		manager,
		s.version
	);
}

async function aSlot(index: number) {
	const s = await getStoreSettings();
	return slots(await getSchedule(db(), { fresh: true }), new Date(), s.prepTimeMinutes)[index];
}

beforeAll(async () => {
	manager = await makeStaff('admin');
	await ensureCashOpen(manager);
});

afterAll(async () => {
	await setScheduling(false, null);
	await stopBoss();
	await closeDb();
});

describe('scheduled orders', () => {
	it('is refused while scheduling is off', async () => {
		await setScheduling(false, null);
		await expect(webOrder(await aSlot(8))).rejects.toThrow();
	});

	it('hides a scheduled order from the kitchen until its time, and fills a slot', async () => {
		await setScheduling(true, 1);
		const slot = await aSlot(8);
		const o = await webOrder(slot);
		const [row] = await db()<{ scheduled_for: Date; promised_at: Date }[]>`
			select scheduled_for, promised_at from orders where id = ${o.id}`;
		expect(row.scheduled_for).toEqual(slot);
		expect(row.promised_at).toEqual(slot);
		expect((await listKitchenOrders()).some((k) => k.id === o.id)).toBe(false);

		// The slot is full; the next one is free.
		await expect(webOrder(slot)).rejects.toThrow();
		const other = await webOrder(await aSlot(9));
		expect(other.status).toBe('confirmed');

		// Time to start it: the kitchen sees it now.
		const { prepTimeMinutes } = await getStoreSettings();
		await db()`update orders set scheduled_for = now() + make_interval(mins => ${prepTimeMinutes - 1})
			where id = ${o.id}`;
		expect((await listKitchenOrders()).some((k) => k.id === o.id)).toBe(true);
		await db()`update orders set status = 'cancelled' where id in (${o.id}, ${other.id})`;
	});

	it('refuses a time that is not an offered slot', async () => {
		await setScheduling(true, null);
		const slot = await aSlot(3);
		await expect(webOrder(new Date(slot.getTime() + 5 * 60_000))).rejects.toThrow();
		await expect(webOrder(new Date(Date.now() - 60 * 60_000))).rejects.toThrow();
	});
});
