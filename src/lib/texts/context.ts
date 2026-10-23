// Components read the shop's texts through context, set once by the root layout.
import { getContext, setContext } from 'svelte';
import { defaultTexts, fill, isTextKey, type TextKey, type Texts } from './catalog';

const KEY = Symbol('texts');
const DEFAULTS = defaultTexts();

export type T = (key: TextKey, vars?: Record<string, string | number>) => string;

/** Call in the root layout; `get` is read on every lookup so edits show up after a reload of data. */
export function setTexts(get: () => Texts | undefined) {
	setContext(KEY, get);
}

/** Call during component setup; the returned `t` can be used anywhere afterwards. */
export function useTexts(): T {
	const get = getContext<(() => Texts | undefined) | undefined>(KEY);
	return (key, vars) => fill(get?.()?.[key] ?? DEFAULTS[key], vars);
}

/**
 * The short labels many screens share (order types, payment methods, states, weekdays),
 * read from the catalog so the owner can rename them. Unknown values show as they are.
 */
export function useLabels(t: T = useTexts()) {
	const known = (key: string, fallback: string) => (isTextKey(key) ? t(key) : fallback);
	return {
		/** "Comer aqui · mesa 7", "Para viagem", ... */
		fulfillment: (type: string, table?: string | null) =>
			type === 'dine_in' && table
				? t('fulfillment.table', { label: t('fulfillment.dine_in'), table })
				: known(`fulfillment.${type}`, type),
		method: (method: string) => known(`method.${method}`, method),
		status: (status: string) => known(`status.${status}`, status),
		payment: (status: string) => known(`payment.status.${status}`, status),
		weekday: (day: number) => known(`weekday.${day}`, String(day))
	};
}
