// The owner's edits to customer-facing texts. Only changed texts are stored;
// everything else comes from the defaults in src/lib/texts/catalog.ts.
import {
	defaultTexts,
	isTextKey,
	placeholders,
	TEXT_GROUPS,
	TEXTS,
	type TextGroup,
	type TextKey,
	type Texts
} from '#lib/texts/catalog.ts';
import { audit, type Actor } from '../audit';
import { db, type Db } from '../db';
import { DomainError } from '../errors';

const TTL_MS = 10_000;
const MAX_LENGTH = 1000;
let cache: { value: Texts; at: number } | undefined;

async function overrides(sql: Db): Promise<Map<TextKey, string>> {
	const rows = await sql<{ key: string; value: string }[]>`select key, value from ui_texts`;
	// A text removed from the catalog leaves a harmless row behind; ignore it.
	return new Map(rows.filter((r) => isTextKey(r.key)).map((r) => [r.key as TextKey, r.value]));
}

export async function getTexts(sql: Db = db(), { fresh = false } = {}): Promise<Texts> {
	if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache.value;
	const value = { ...defaultTexts(), ...Object.fromEntries(await overrides(sql)) } as Texts;
	cache = { value, at: Date.now() };
	return value;
}

export interface EditableText {
	key: TextKey;
	label: string;
	default: string;
	value: string;
	changed: boolean;
}

export async function listTextsForEditor(
	sql: Db = db()
): Promise<{ group: TextGroup; title: string; texts: EditableText[] }[]> {
	const saved = await overrides(sql);
	return (Object.keys(TEXT_GROUPS) as TextGroup[]).map((group) => ({
		group,
		title: TEXT_GROUPS[group],
		texts: (Object.keys(TEXTS) as TextKey[])
			.filter((k) => TEXTS[k].group === group)
			.map((key) => ({
				key,
				label: TEXTS[key].label,
				default: TEXTS[key].default,
				value: saved.get(key) ?? TEXTS[key].default,
				changed: saved.has(key)
			}))
	}));
}

/**
 * Saves the given texts. A text left empty or equal to its default goes back
 * to the default. Each edited text must keep the {names} its default uses.
 */
export async function saveTexts(input: Record<string, string>, actor: Actor) {
	const set: [TextKey, string][] = [];
	const reset: TextKey[] = [];
	for (const [key, raw] of Object.entries(input)) {
		if (!isTextKey(key)) continue;
		const value = raw.replace(/\r\n/g, '\n').trim();
		const def = TEXTS[key];
		if (!value || value === def.default) {
			reset.push(key);
			continue;
		}
		if (value.length > MAX_LENGTH)
			throw new DomainError(`"${def.label}" pode ter no máximo ${MAX_LENGTH} letras.`, key);
		const need = placeholders(def.default);
		const have = placeholders(value);
		if (need.join() !== have.join()) {
			throw new DomainError(
				need.length
					? `"${def.label}" precisa ter ${need.map((n) => `{${n}}`).join(', ')}, e nada além disso entre chaves.`
					: `"${def.label}" não pode ter palavras entre chaves.`,
				key
			);
		}
		set.push([key, value]);
	}
	await db().begin(async (tx) => {
		const before = await overrides(tx);
		const changed = set.filter(([k, v]) => before.get(k) !== v);
		const cleared = reset.filter((k) => before.has(k));
		if (!changed.length && !cleared.length) return;
		for (const [key, value] of changed) {
			await tx`insert into ui_texts (key, value, updated_by) values (${key}, ${value}, ${actor.id})
				on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by,
					updated_at = now()`;
		}
		if (cleared.length) await tx`delete from ui_texts where key in ${tx(cleared)}`;
		await audit(tx, actor, 'store.texts_updated', 'ui_texts', null, {
			changed: changed.map(([k]) => k),
			reset: cleared
		});
	});
	cache = undefined;
}
