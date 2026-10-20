// Development only: simulates the PSP calling our webhook for a stub payment.
import { error, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { config } from '#lib/server/config.ts';
import { db } from '#lib/server/db.ts';
import { signStub } from '#lib/server/payments/local-stub.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, fetch }) => {
	const c = config();
	if (c.PAYMENT_PROVIDER !== 'local_stub' || c.NODE_ENV === 'production') error(404, 'Não encontrado.');
	const [t] = await db()<{ provider_reference: string }[]>`
		select t.provider_reference from tenders t join orders o on o.id = t.order_id
		where o.public_token = ${params.token} and t.provider = 'local_stub' order by t.created_at desc limit 1`;
	if (!t) error(404, 'Pagamento não encontrado.');
	const body = JSON.stringify({ id: `evt_${randomUUID()}`, type: 'payment.updated', payment_id: t.provider_reference, status: 'paid' });
	const res = await fetch('/api/v1/payments/webhooks/local_stub', {
		method: 'POST',
		body,
		headers: { 'content-type': 'application/json', 'x-stub-signature': signStub(body) }
	});
	if (!res.ok) error(500, `webhook returned ${res.status}`);
	redirect(303, `/checkout/payment/${params.token}`);
};
