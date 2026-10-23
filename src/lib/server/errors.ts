import { fill, TEXTS, type TextKey } from '#lib/texts/catalog.ts';

export type TextVars = Record<string, string | number>;

/**
 * An expected business-rule failure whose message is safe to show staff/customers.
 * The message is a key in the text catalog, so the owner can reword it; `message` holds
 * the default wording. Pass `{ text }` only for words that are already final (the owner's
 * own pause reason, a text already read from the catalog).
 */
export class DomainError extends Error {
	readonly key: TextKey | null;
	readonly vars: TextVars;
	readonly code: string;
	readonly status: number;

	constructor(
		message: TextKey | { text: string },
		{
			code = 'invalid',
			status = 400,
			vars = {}
		}: { code?: string; status?: number; vars?: TextVars } = {}
	) {
		super(typeof message === 'string' ? fill(TEXTS[message].default, vars) : message.text);
		this.key = typeof message === 'string' ? message : null;
		this.vars = vars;
		this.code = code;
		this.status = status;
	}
}
