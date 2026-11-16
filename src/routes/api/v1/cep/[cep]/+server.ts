// Checkout address autofill from the CEP (ViaCEP), rate-limited per visitor.
import { error, json } from '@sveltejs/kit';
import { lookupCep } from '#lib/server/delivery/geo.ts';
import { clientKey, rateLimit } from '#lib/server/rate-limit.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	if (!/^\d{8}$/.test(event.params.cep)) error(400, 'CEP inválido.');
	if (!rateLimit(`cep:${clientKey(event)}`, 30, 10 * 60_000)) error(429, 'Muitas consultas.');
	const address = await lookupCep(event.params.cep);
	return json({ address }, { headers: { 'cache-control': 'public, max-age=86400' } });
};
