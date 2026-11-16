// S5.2: the promised time grows with the kitchen queue, and deliveries add the trip.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import {
	currentEstimate,
	getStoreSettings,
	openKitchenOrders
} from '#lib/server/settings/service.ts';
import { ensureCashOpen, makeStaff } from './helpers.ts';

let manager: Awaited<ReturnType<typeof makeStaff>>;

const order = () =>
	createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [
			{ sku: 'BRG-CLASSICO', quantity: 1, options: [{ groupId: 'ponto', sku: 'PONTO-AO' }] }
		] as never,
		fulfillmentType: 'counter',
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		actor: manager
	});

const promisedMinutes = async (id: string) => {
	const [r] = await db()<{ m: number }[]>`
		select round(extract(epoch from promised_at - created_at) / 60)::int as m from orders where id = ${id}`;
	return r.m;
};

beforeAll(async () => {
	manager = await makeStaff('admin');
	await ensureCashOpen(manager);
});

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

describe('dynamic estimate', () => {
	it('adds per-order minutes for each order in the kitchen', async () => {
		const s = await getStoreSettings();
		expect(s.perOrderMinutes).toBe(2);
		expect(s.deliveryMinutes).toBe(20);
		const before = await openKitchenOrders();
		const first = await order();
		expect(await promisedMinutes(first.id)).toBe(s.prepTimeMinutes + before * 2);
		const second = await order();
		expect(await promisedMinutes(second.id)).toBe(s.prepTimeMinutes + (before + 1) * 2);
		const e = await currentEstimate(s);
		expect(e.delivery - e.pickup).toBe(20);
		expect(e.pickup).toBe(s.prepTimeMinutes + (before + 2) * 2);
	});
});
