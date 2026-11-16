import type { IconName } from '#lib/components/atoms/Icon.svelte';

/** A line icon for a menu category, guessed from its name; `fallback` (the preset's product icon) otherwise. */
export function categoryIcon(name: string, fallback: IconName = 'grid'): IconName {
	const n = name.toLowerCase();
	if (/combo/.test(n)) return 'combo';
	if (/bebida|drink|refri|suco|cerveja/.test(n)) return 'drink';
	if (/acompanh|batata|fritas|porç|petisc/.test(n)) return 'fries';
	if (/sobremesa|doce|shake|sorvete|açaí|acai|bolo/.test(n)) return 'dessert';
	if (/lanche|burger|hamb|sanduí|sandui/.test(n)) return 'burger';
	if (/pizza|prato|refeiç|almoço|executivo/.test(n)) return 'chef';
	if (/café|cafe|cafés/.test(n)) return 'drink';
	if (/destaque|mais pedidos|popular/.test(n)) return 'crown';
	return fallback;
}
