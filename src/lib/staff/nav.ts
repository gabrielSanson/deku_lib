// Admin navigation, grouped the way the shop works: running the shift, the
// menu, the shop itself and the back office. Kitchen accounts never see it;
// they are sent to the kitchen screen.
import type { IconName } from '#lib/components/atoms/Icon.svelte';
import type { TextKey } from '#lib/texts/catalog.ts';

export interface NavLink {
	href: string;
	/** Text catalog key, so the owner can rename menu items in Textos do site. */
	label: TextKey;
	/** 'product' is the shop preset's product icon (branding.productIcon). */
	icon: IconName | 'product';
	/** Other paths that light up this link. */
	match?: string[];
}

/** The icon to draw for a link, given the preset's product icon from the page data. */
export function navIcon(icon: NavLink['icon'], productIcon: IconName = 'grid'): IconName {
	return icon === 'product' ? productIcon : icon;
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
				icon: 'product',
				match: ['/staff/menu/products', '/staff/menu/groups']
			},
			{ href: '/staff/menu/ingredients', label: 'nav.ingredientes', icon: 'list' }
		]
	},
	{
		label: 'nav.gestao',
		links: [
			{ href: '/staff/analytics', label: 'nav.relatorios', icon: 'chart' },
			{ href: '/staff/campaigns', label: 'nav.campanhas', icon: 'crown' },
			{
				href: '/staff/settings/profile',
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

/**
 * The settings pages, shown inside Configurações as four groups: the shop itself,
 * how orders come in, the customer site, and money plus outside services.
 */
export const SETTINGS_GROUPS: NavGroup[] = [
	{
		label: 'nav.grupoLoja',
		links: [
			{ href: '/staff/settings/profile', label: 'nav.dadosDaLoja', icon: 'store' },
			{ href: '/staff/settings/hours', label: 'nav.horariosEPausa', icon: 'clock' },
			{ href: '/staff/settings/staff', label: 'nav.equipe', icon: 'users' }
		]
	},
	{
		label: 'nav.grupoPedidos',
		links: [
			{ href: '/staff/settings/store', label: 'nav.tiposDePedido', icon: 'receipt' },
			{ href: '/staff/settings/delivery', label: 'nav.entrega', icon: 'truck' }
		]
	},
	{
		label: 'nav.grupoSite',
		links: [
			{ href: '/staff/settings/home', label: 'nav.paginaInicial', icon: 'home' },
			{ href: '/staff/settings/appearance', label: 'nav.aparencia', icon: 'settings' },
			{ href: '/staff/settings/texts', label: 'nav.textosDoSite', icon: 'book' },
			{ href: '/staff/settings/pages', label: 'nav.paginasDoSite', icon: 'book' }
		]
	},
	{
		label: 'nav.grupoPagamentos',
		links: [
			{ href: '/staff/settings/payments', label: 'nav.pagamentos', icon: 'cash' },
			{ href: '/staff/settings/ifood', label: 'nav.ifood', icon: 'grid' },
			{ href: '/staff/settings/fiscal', label: 'nav.notaFiscal', icon: 'receipt' }
		]
	}
];

/** The one-time setup wizard, linked from the top of Configurações rather than shown as a tab. */
export const SETUP_HREF = '/staff/setup';

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
