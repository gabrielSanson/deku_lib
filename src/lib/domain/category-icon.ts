import type { IconName } from '#lib/components/atoms/Icon.svelte';

/** A line icon for a menu category, guessed from its name. */
export function categoryIcon(name: string): IconName {
	const n = name.toLowerCase();
	if (/combo/.test(n)) return 'combo';
	if (/bebida|drink|refri|suco|cerveja/.test(n)) return 'drink';
	if (/acompanh|batata|fritas|porç|petisc/.test(n)) return 'fries';
	if (/sobremesa|doce|shake|sorvete/.test(n)) return 'dessert';
	if (/destaque|mais pedidos|popular/.test(n)) return 'crown';
	return 'burger';
}
