import { fail } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { PricingError } from '#lib/domain/pricing.ts';
import { CatalogUnavailableError } from './catalog/service';
import { DomainError } from './errors';

/** Turns expected business errors into form failures; rethrows everything else. */
export async function attempt<T>(fn: () => Promise<T>) {
	try {
		return await fn();
	} catch (err) {
		if (err instanceof DomainError) return fail(err.status, { error: err.message, code: err.code });
		if (err instanceof PricingError) return fail(400, { error: err.message, code: 'pricing' });
		if (err instanceof CatalogUnavailableError) return fail(503, { error: err.message, code: 'catalog' });
		if (err instanceof ZodError) return fail(400, { error: 'Dados inválidos.', code: 'validation' });
		throw err;
	}
}

export function formString(data: FormData, key: string): string {
	const v = data.get(key);
	return typeof v === 'string' ? v.trim() : '';
}
