// Development only: a fake hosted card page for the local payment stub.
import { error, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { config } from '#lib/server/config.ts';
import { signStub } from '#lib/server/payments/local-stub.ts';
import type { Actions, PageServerLoad } from './$types';

function guard() {
	const c = config();
	if (c.PAYMENT_PROVIDER !== 'local_stub' || c.NODE_ENV === 'production') error(404, 'Não encontrado.');
}

function safeReturn(url: URL) {
	const r = url.searchParams.get('return') ?? '/';
	const target = new URL(r, url);
	return target.origin === url.origin ? target.pathname + target.search : '/';
}

export const load: PageServerLoad = async ({ url }) => {
	guard();
	return { payment: url.searchParams.get('payment') ?? '' };
};

async function send(fetch: typeof globalThis.fetch, payment: string, status: 'paid' | 'failed') {
	const body = JSON.stringify({ id: `evt_${randomUUID()}`, type: 'payment.updated', payment_id: payment, status });
	const res = await fetch('/api/v1/payments/webhooks/local_stub', {
		method: 'POST',
		body,
		headers: { 'content-type': 'application/json', 'x-stub-signature': signStub(body) }
	});
	if (!res.ok) error(500, `webhook returned ${res.status}`);
}

export const actions: Actions = {
	approve: async ({ url, fetch }) => {
		guard();
		await send(fetch, url.searchParams.get('payment') ?? '', 'paid');
		redirect(303, safeReturn(url));
	},
	decline: async ({ url, fetch }) => {
		guard();
		await send(fetch, url.searchParams.get('payment') ?? '', 'failed');
		redirect(303, safeReturn(url));
	}
};
