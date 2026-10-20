// Ids for menu entries, derived from the names staff type.

function ascii(text: string) {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^A-Za-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** "Pão & Cia Clássico" → "pao-cia-classico" */
export function slugify(text: string, max = 60): string {
	return ascii(text).toLowerCase().slice(0, max).replace(/-+$/, '');
}

/** "Bacon extra" with prefix "ADD" → "ADD-BACON-EXTRA" */
export function skuFrom(text: string, prefix = ''): string {
	const body = ascii(text).toUpperCase();
	return (prefix ? `${prefix}-${body}` : body).slice(0, 40).replace(/-+$/, '');
}
