// Admin navigation, grouped the way the shop works: running the shift, the
// menu, the shop itself and the back office. Kitchen accounts never see it;
// they are sent to the kitchen screen.
import type { IconName } from '#lib/components/atoms/Icon.svelte';
import type { Permission } from '#lib/domain/permissions.ts';
import type { TextKey } from '#lib/texts/catalog.ts';

export interface NavLink {
	href: string;
	/** Text catalog key, so the owner can rename menu items in Textos do site. */
	label: TextKey;
	/** 'product' is the shop preset's product icon (branding.productIcon). */
	icon: IconName | 'product';
	/** Other paths that light up this link. */
	match?: string[];
	/** Shown only to members with this permission (S5.7); absent = every staff member. */
	permission?: Permission;
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
			{ href: '/staff/pos', label: 'nav.caixa', icon: 'cart', permission: 'pos.sell' },
			{ href: '/staff/caixa', label: 'nav.gaveta', icon: 'cash', permission: 'cash.open_close' },
			{ href: '/staff/orders', label: 'nav.pedidos', icon: 'list' },
			{ href: '/kitchen', label: 'nav.cozinha', icon: 'chef' },
			{ href: '/staff/entregas', label: 'nav.entregas', icon: 'bag', permission: 'pos.sell' },
			{ href: '/staff/ponto', label: 'nav.ponto', icon: 'clock' },
			{
				href: '/staff/reconciliation',
				label: 'nav.caixaDoDia',
				icon: 'receipt',
				permission: 'cash.open_close'
			}
		]
	},
	{
		label: 'nav.cardapio',
		links: [
			{
				href: '/staff/menu',
				label: 'nav.disponibilidade',
				icon: 'check',
				permission: 'menu.availability'
			},
			{
				href: '/staff/menu/edit',
				label: 'nav.produtosEAdicionais',
				icon: 'product',
				match: ['/staff/menu/products', '/staff/menu/groups'],
				permission: 'menu.edit'
			},
			{
				href: '/staff/menu/ingredients',
				label: 'nav.ingredientes',
				icon: 'list',
				permission: 'menu.edit'
			}
		]
	},
	{
		label: 'nav.gestao',
		links: [
			{
				href: '/staff/analytics',
				label: 'nav.relatorios',
				icon: 'chart',
				permission: 'reports.view'
			},
			{
				href: '/staff/clientes',
				label: 'nav.clientes',
				icon: 'users',
				permission: 'customers.view'
			},
			{ href: '/staff/estoque', label: 'nav.estoque', icon: 'bag', permission: 'menu.edit' },
			{
				href: '/staff/despesas',
				label: 'nav.despesas',
				icon: 'receipt',
				permission: 'finance.edit'
			},
			{
				href: '/staff/campaigns',
				label: 'nav.campanhas',
				icon: 'crown',
				permission: 'settings.edit'
			},
			{
				href: '/staff/settings/profile',
				label: 'nav.configuracoes',
				icon: 'settings',
				match: ['/staff/settings', '/staff/setup'],
				permission: 'settings.edit'
			}
		]
	}
];

/** The menu for a member: only the links their permissions open (S5.7). */
export function navFor(staff: { permissions: readonly Permission[] }): NavGroup[] {
	return filterGroups(NAV, staff.permissions);
}

export function filterGroups(groups: NavGroup[], permissions: readonly Permission[]): NavGroup[] {
	return groups
		.map((g) => ({
			...g,
			links: g.links.filter((l) => !l.permission || permissions.includes(l.permission))
		}))
		.filter((g) => g.links.length);
}

/**
 * The settings pages, shown inside Configurações as four groups: the shop itself,
 * how orders come in, the customer site, and money plus outside services.
 */
export const SETTINGS_GROUPS: NavGroup[] = [
	{
		label: 'nav.grupoLoja',
		links: [
			{
				href: '/staff/settings/profile',
				label: 'nav.dadosDaLoja',
				icon: 'store',
				permission: 'settings.edit'
			},
			{
				href: '/staff/settings/hours',
				label: 'nav.horariosEPausa',
				icon: 'clock',
				permission: 'settings.edit'
			},
			{
				href: '/staff/settings/staff',
				label: 'nav.equipe',
				icon: 'users',
				permission: 'staff.manage'
			},
			{
				href: '/staff/escala',
				label: 'nav.escala',
				icon: 'clock',
				permission: 'staff.manage'
			},
			{
				href: '/staff/settings/permissoes',
				label: 'nav.permissoes',
				icon: 'check',
				permission: 'staff.manage'
			},
			{
				href: '/staff/settings/system',
				label: 'nav.sistema',
				icon: 'settings',
				permission: 'settings.edit'
			},
			{
				href: '/staff/settings/plano',
				label: 'nav.plano',
				icon: 'card',
				permission: 'finance.edit'
			}
		]
	},
	{
		label: 'nav.grupoPedidos',
		links: [
			{
				href: '/staff/settings/store',
				label: 'nav.tiposDePedido',
				icon: 'receipt',
				permission: 'settings.edit'
			},
			{
				href: '/staff/settings/delivery',
				label: 'nav.entrega',
				icon: 'truck',
				permission: 'settings.edit'
			}
		]
	},
	{
		label: 'nav.grupoSite',
		links: [
			{
				href: '/staff/settings/home',
				label: 'nav.paginaInicial',
				icon: 'home',
				permission: 'settings.edit'
			},
			{
				href: '/staff/settings/appearance',
				label: 'nav.aparencia',
				icon: 'settings',
				permission: 'settings.edit'
			},
			{
				href: '/staff/settings/texts',
				label: 'nav.textosDoSite',
				icon: 'book',
				permission: 'settings.edit'
			},
			{
				href: '/staff/settings/pages',
				label: 'nav.paginasDoSite',
				icon: 'book',
				permission: 'settings.edit'
			},
			{
				href: '/staff/settings/divulgar',
				label: 'nav.divulgar',
				icon: 'tag',
				permission: 'settings.edit'
			}
		]
	},
	{
		label: 'nav.grupoPagamentos',
		links: [
			{
				href: '/staff/settings/payments',
				label: 'nav.pagamentos',
				icon: 'cash',
				permission: 'finance.edit'
			},
			{
				href: '/staff/settings/ifood',
				label: 'nav.ifood',
				icon: 'grid',
				permission: 'settings.edit'
			},
			{
				href: '/staff/settings/opendelivery',
				label: 'nav.opendelivery',
				icon: 'grid',
				permission: 'settings.edit'
			},
			{
				href: '/staff/settings/whatsapp',
				label: 'nav.whatsapp',
				icon: 'mail',
				permission: 'settings.edit'
			},
			{
				href: '/staff/settings/fiscal',
				label: 'nav.notaFiscal',
				icon: 'receipt',
				permission: 'fiscal.manage'
			}
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
