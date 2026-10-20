// Admin navigation, grouped the way the shop works: running the shift, the
// menu, the shop itself and the back office. Kitchen accounts never see it;
// they are sent to the kitchen screen.
import type { IconName } from '#lib/components/Icon.svelte';

export interface NavLink {
	href: string;
	label: string;
	icon: IconName;
	/** Other paths that light up this link. */
	match?: string[];
}

export interface NavGroup {
	label: string;
	links: NavLink[];
}

export const NAV: NavGroup[] = [
	{
		label: 'Operação',
		links: [
			{ href: '/staff', label: 'Início', icon: 'home' },
			{ href: '/staff/pos', label: 'Caixa', icon: 'cart' },
			{ href: '/staff/orders', label: 'Pedidos', icon: 'list' },
			{ href: '/kitchen', label: 'Cozinha', icon: 'chef' },
			{ href: '/staff/reconciliation', label: 'Caixa do dia', icon: 'cash' }
		]
	},
	{
		label: 'Cardápio',
		links: [
			{ href: '/staff/menu', label: 'Disponibilidade', icon: 'check' },
			{
				href: '/staff/menu/edit',
				label: 'Produtos e adicionais',
				icon: 'burger',
				match: ['/staff/menu/products', '/staff/menu/groups']
			},
			{ href: '/staff/menu/ingredients', label: 'Ingredientes', icon: 'list' },
			{ href: '/staff/menu/pages', label: 'Páginas do site', icon: 'book' }
		]
	},
	{
		label: 'Loja',
		links: [
			{ href: '/staff/settings/store', label: 'Funcionamento', icon: 'receipt' },
			{ href: '/staff/settings/hours', label: 'Horários', icon: 'clock' },
			{ href: '/staff/settings/profile', label: 'Dados e Pix', icon: 'store' },
			{ href: '/staff/settings/appearance', label: 'Aparência', icon: 'settings' },
			{ href: '/staff/settings/texts', label: 'Textos do site', icon: 'book' },
			{ href: '/staff/settings/delivery', label: 'Entrega', icon: 'truck' },
			{ href: '/staff/settings/integrations', label: 'Integrações', icon: 'grid' }
		]
	},
	{
		label: 'Gestão',
		links: [
			{ href: '/staff/analytics', label: 'Relatórios', icon: 'chart' },
			{ href: '/staff/settings/staff', label: 'Equipe', icon: 'users' },
			{ href: '/staff/setup', label: 'Configuração inicial', icon: 'settings' }
		]
	}
];

/** The most specific link for the current path, so "/staff/menu/edit" beats "/staff/menu". */
export function activeHref(groups: NavGroup[], pathname: string): string | null {
	let best: { href: string; len: number } | null = null;
	for (const link of groups.flatMap((g) => g.links)) {
		for (const prefix of [link.href, ...(link.match ?? [])]) {
			const hit =
				prefix === '/staff'
					? pathname === '/staff'
					: pathname === prefix || pathname.startsWith(prefix + '/');
			if (hit && (!best || prefix.length > best.len))
				best = { href: link.href, len: prefix.length };
		}
	}
	return best?.href ?? null;
}
