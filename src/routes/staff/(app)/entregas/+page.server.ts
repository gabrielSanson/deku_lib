// Operação → Entregas: group ready deliveries into a run, give it to a courier, settle it.
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, COUNTER, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { parseBRL } from '#lib/domain/money.ts';
import {
	addCourier,
	awaitingDispatch,
	createRun,
	listCouriers,
	markDelivered,
	markLeft,
	newCourierLink,
	openRuns,
	removeFromRun,
	settleRun,
	updateCourier
} from '#lib/server/delivery/couriers.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, COUNTER);
	event.depends('app:orders');
	return {
		waiting: await awaitingDispatch(),
		runs: await openRuns(),
		couriers: await listCouriers()
	};
};

const link = (origin: string, token: string) => `${origin}/entregador/${token}`;

export const actions: Actions = {
	run: async (event) => {
		const staff = requireStaff(event, COUNTER);
		const d = await event.request.formData();
		const ids = d.getAll('orderId').map(String);
		return attempt(async () => {
			await createRun(formString(d, 'courierId'), ids, staffActor(staff));
			return { ok: true };
		});
	},
	remove: async (event) => {
		const staff = requireStaff(event, COUNTER);
		const id = formString(await event.request.formData(), 'orderId');
		return attempt(async () => {
			await removeFromRun(id, staffActor(staff));
			return { ok: true };
		});
	},
	left: async (event) => {
		const staff = requireStaff(event, COUNTER);
		const id = formString(await event.request.formData(), 'runId');
		return attempt(async () => {
			await markLeft(id, staffActor(staff));
			return { ok: true };
		});
	},
	delivered: async (event) => {
		const staff = requireStaff(event, COUNTER);
		const id = formString(await event.request.formData(), 'orderId');
		return attempt(async () => {
			await markDelivered(id, staffActor(staff));
			return { ok: true };
		});
	},
	settle: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const id = formString(await event.request.formData(), 'runId');
		return attempt(async () => {
			const payout = await settleRun(id, staffActor(staff));
			return { settled: payout };
		});
	},
	addCourier: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		return attempt(async () => {
			const { token } = await addCourier(
				{
					name: formString(d, 'name'),
					phone: formString(d, 'phone') || null,
					payPerDeliveryCents: parseBRL(formString(d, 'pay') || '0') ?? -1
				},
				staffActor(staff)
			);
			return { link: link(event.url.origin, token) };
		});
	},
	updateCourier: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		return attempt(async () => {
			await updateCourier(
				formString(d, 'id'),
				{
					name: formString(d, 'name'),
					phone: formString(d, 'phone') || null,
					payPerDeliveryCents: parseBRL(formString(d, 'pay') || '0') ?? -1,
					active: d.get('active') === 'on'
				},
				staffActor(staff)
			);
			return { ok: true };
		});
	},
	newLink: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const id = formString(await event.request.formData(), 'id');
		return attempt(async () => {
			return { link: link(event.url.origin, await newCourierLink(id, staffActor(staff))) };
		});
	}
};
