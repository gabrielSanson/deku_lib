// Admin navigation, grouped the way the shop works: running the shift, the
// menu, the shop itself and the back office. Kitchen accounts never see it;
// they are sent to the kitchen screen.
import type { IconName } from '#lib/components/atoms/Icon.svelte';
import type { TextKey } from '#lib/texts/catalog.ts';

export interface NavLink {
	href: string;
	/** Text catalog key, so the owner can rename menu items in Textos do site. */
	label: TextKey;
	icon: IconName;
	/** Other paths that light up this link. */
	match?: string[];
}

export interface NavGroup {
	label: TextKey;
	links: NavLink[];
}

export const NAV: NavGroup[] = [
	{
		label: 'nav.operacao',
		links: [
			{ href: '/staff', label: 'nav.inicio', icon: 'home' },
			{ href: '/staff/pos', label: 'nav.caixa', icon: 'cart' },
			{ href: '/staff/caixa', label: 'nav.gaveta', icon: 'cash' },
			{ href: '/staff/orders', label: 'nav.pedidos', icon: 'list' },
			{ href: '/kitchen', label: 'nav.cozinha', icon: 'chef' },
			{ href: '/staff/reconciliation', label: 'nav.caixaDoDia', icon: 'receipt' }
		]
	},
	{
		label: 'nav.cardapio',
		links: [
			{ href: '/staff/menu', label: 'nav.disponibilidade', icon: 'check' },
			{
				href: '/staff/menu/edit',
				label: 'nav.produtosEAdicionais',
				icon: 'burger',
				match: ['/staff/menu/products', '/staff/menu/groups']
			},
			{ href: '/staff/menu/ingredients', label: 'nav.ingredientes', icon: 'list' },
			{ href: '/staff/menu/pages', label: 'nav.paginasDoSite', icon: 'book' }
		]
	},
	{
		label: 'nav.gestao',
		links: [
			{ href: '/staff/analytics', label: 'nav.relatorios', icon: 'chart' },
			{ href: '/staff/campaigns', label: 'nav.campanhas', icon: 'crown' },
			{ href: '/staff/settings/staff', label: 'nav.equipe', icon: 'users' },
			{
				href: '/staff/settings/store',
				label: 'nav.configuracoes',
				icon: 'settings',
				match: ['/staff/settings', '/staff/setup']
			}
		]
	}
];

/** What an attendant sees in the menu: the counter, the drawer, the orders and the kitchen screen. */
const ATTENDANT_HREFS = new Set([
	'/staff',
	'/staff/pos',
	'/staff/caixa',
	'/staff/orders',
	'/kitchen'
]);

/** The menu for a role. Admins see everything; attendants only the counter and orders. */
export function navFor(role: 'admin' | 'attendant' | 'kitchen'): NavGroup[] {
	if (role === 'admin') return NAV;
	return NAV.map((g) => ({
		...g,
		links: g.links.filter((l) => ATTENDANT_HREFS.has(l.href))
	})).filter((g) => g.links.length);
}

/** The settings pages, shown as a sub-menu inside Configurações. */
export const SETTINGS_LINKS: NavLink[] = [
	{ href: '/staff/settings/store', label: 'nav.funcionamento', icon: 'receipt' },
	{ href: '/staff/settings/hours', label: 'nav.horarios', icon: 'clock' },
	{ href: '/staff/settings/profile', label: 'nav.dadosEPix', icon: 'store' },
	{ href: '/staff/settings/fiscal', label: 'nav.notaFiscal', icon: 'receipt' },
	{ href: '/staff/settings/appearance', label: 'nav.aparencia', icon: 'settings' },
	{ href: '/staff/settings/texts', label: 'nav.textosDoSite', icon: 'book' },
	{ href: '/staff/settings/delivery', label: 'nav.entrega', icon: 'truck' },
	{ href: '/staff/settings/integrations', label: 'nav.integracoes', icon: 'grid' },
	{ href: '/staff/settings/staff', label: 'nav.equipe', icon: 'users' },
	{ href: '/staff/setup', label: 'nav.configuracaoInicial', icon: 'settings' }
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
