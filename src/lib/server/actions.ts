import { fail } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { PricingError } from '#lib/domain/pricing.ts';
import { fill, type TextKey } from '#lib/texts/catalog.ts';
import { CatalogUnavailableError } from './catalog/service';
import { DomainError, type TextVars } from './errors';
import { getTexts, shopDefaultTexts } from './settings/texts';

/** A catalog text with the owner's edits; the built-in wording if the database is unreachable. */
export async function shopText(key: TextKey, vars?: TextVars): Promise<string> {
	const texts = await getTexts().catch(() => shopDefaultTexts());
	return fill(texts[key], vars);
}

/** A form failure whose message is a catalog text, so the owner can reword it. */
export async function failText<D extends Record<string, unknown> = Record<never, never>>(
	status: number,
	key: TextKey,
	{ data, vars }: { data?: D; vars?: TextVars } = {}
) {
	return fail(status, { ...(data as D), error: await shopText(key, vars) });
}

/** Turns expected business errors into form failures; rethrows everything else. */
export async function attempt<T>(fn: () => Promise<T>) {
	try {
		return await fn();
	} catch (err) {
		if (err instanceof DomainError) {
			const error = err.key ? await shopText(err.key, err.vars) : err.message;
			return fail(err.status, { error, code: err.code });
		}
		if (err instanceof PricingError)
			return fail(400, { error: await shopText(err.key, err.vars), code: 'pricing' });
		if (err instanceof CatalogUnavailableError)
			return fail(503, { error: await shopText('err.catalog.unavailable'), code: 'catalog' });
		if (err instanceof ZodError)
			return fail(400, { error: await shopText('err.data.invalid'), code: 'validation' });
		throw err;
	}
}

export function formString(data: FormData, key: string): string {
	const v = data.get(key);
	return typeof v === 'string' ? v.trim() : '';
}
