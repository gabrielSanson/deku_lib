// Components read the shop's texts through context, set once by the root layout.
import { getContext, setContext } from 'svelte';
import { defaultTexts, fill, type TextKey, type Texts } from './catalog';

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
