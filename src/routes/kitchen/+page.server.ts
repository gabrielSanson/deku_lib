import { attempt, failText, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { listKitchenOrders } from '#lib/server/orders/queries.ts';
import { callOrder, markKitchenSeen, transitionOrder } from '#lib/server/orders/service.ts';
import {
	pairStation,
	STATION_COOKIE,
	stationByToken,
	unpairStation
} from '#lib/server/printing/queue.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event);
	event.depends('app:orders');
	const station = await stationByToken(event.cookies.get(STATION_COOKIE));
	return {
		orders: await listKitchenOrders(),
		loadedAt: new Date(),
		station: station ? { id: station.id, name: station.name } : null
	};
};

export const actions: Actions = {
	// "Esta tela imprime": an admin pairs this device once; the cookie lasts a year.
	pair: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const name = formString(await event.request.formData(), 'name');
		return attempt(async () => {
			const { token } = await pairStation(name, ['kitchen'], staffActor(staff));
			event.cookies.set(STATION_COOKIE, token, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: event.url.protocol === 'https:',
				maxAge: 365 * 86_400
			});
			return { ok: true };
		});
	},
	unpair: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const station = await stationByToken(event.cookies.get(STATION_COOKIE));
		if (station) await unpairStation(station.id, staffActor(staff));
		event.cookies.delete(STATION_COOKIE, { path: '/' });
		return { ok: true };
	},
	seen: async (event) => {
		const staff = requireStaff(event);
		const id = formString(await event.request.formData(), 'orderId');
		await markKitchenSeen(id, staffActor(staff));
		return { ok: true };
	},
	call: async (event) => {
		const staff = requireStaff(event);
		const id = formString(await event.request.formData(), 'orderId');
		return attempt(async () => {
			await callOrder(id, staffActor(staff));
			return { ok: true };
		});
	},
	move: async (event) => {
		const staff = requireStaff(event);
		const data = await event.request.formData();
		const to = formString(data, 'to');
		if (to !== 'preparing' && to !== 'ready' && to !== 'completed')
			return failText(400, 'err.action.invalid');
		return attempt(async () => {
			await transitionOrder({ orderId: formString(data, 'orderId'), to, actor: staffActor(staff) });
			return { ok: true };
		});
	}
};
