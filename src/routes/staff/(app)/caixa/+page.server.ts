import { fail, redirect } from '@sveltejs/kit';
import { parseBRL } from '#lib/domain/money.ts';
import { attempt, formString } from '#lib/server/actions.ts';
import { COUNTER, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import {
	closeSession,
	getOpenSession,
	getSession,
	listMovements,
	openSession,
	recordDrawerMovement,
	sessionBalance
} from '#lib/server/cash/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const staff = requireStaff(event, COUNTER);
	const session = await getOpenSession();
	// Blind count: only admins see what the drawer should hold before it is closed.
	const balance = session && staff.role === 'admin' ? await sessionBalance(session) : null;
	const movements = session ? await listMovements(session.id) : [];
	const closedId = event.url.searchParams.get('fechado');
	const closed = !session && closedId ? await getSession(closedId) : null;
	return { session, balance, movements, closed, isAdmin: staff.role === 'admin' };
};

const money = (data: FormData, key: string) => parseBRL(formString(data, key));

export const actions: Actions = {
	open: async (event) => {
		const staff = requireStaff(event, COUNTER);
		const data = await event.request.formData();
		const floatCents = money(data, 'float');
		if (floatCents === null) return fail(400, { error: 'Informe o fundo de troco (pode ser 0).' });
		const result = await attempt(() => openSession({ floatCents, actor: staffActor(staff) }));
		if ('id' in result) return { opened: true };
		return result;
	},
	movement: async (event) => {
		const staff = requireStaff(event, COUNTER);
		const data = await event.request.formData();
		const kind = formString(data, 'kind');
		if (kind !== 'sangria' && kind !== 'suprimento')
			return fail(400, { error: 'Movimento inválido.' });
		const amountCents = money(data, 'amount');
		if (!amountCents) return fail(400, { error: 'Informe o valor.' });
		const result = await attempt(() =>
			recordDrawerMovement({
				kind,
				amountCents,
				reason: formString(data, 'reason'),
				actor: staffActor(staff)
			})
		);
		return result ?? { recorded: kind };
	},
	close: async (event) => {
		const staff = requireStaff(event, COUNTER);
		const data = await event.request.formData();
		const countedCents = money(data, 'counted');
		if (countedCents === null)
			return fail(400, { error: 'Informe o valor contado na gaveta (pode ser 0).' });
		const result = await attempt(() =>
			closeSession({ countedCents, note: formString(data, 'note'), actor: staffActor(staff) })
		);
		if ('differenceCents' in result) redirect(303, `/staff/caixa?fechado=${result.id}`);
		return result;
	}
};
