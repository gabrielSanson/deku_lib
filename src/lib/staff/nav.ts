// Staff area navigation, grouped the way the shop works: running the shift,
// the menu, the shop itself and the back office. Roles only hide links; every
// page still checks the role on the server.
import type { IconName } from '#lib/components/Icon.svelte';
import type { StaffRole } from '#lib/domain/order-status.ts';

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

const MANAGER: StaffRole[] = ['owner', 'manager'];
const FRONT: StaffRole[] = ['owner', 'manager', 'cashier'];

type Entry = NavLink & { roles?: StaffRole[] };

const GROUPS: { label: string; links: Entry[] }[] = [
	{
		label: 'Operação',
		links: [
			{ href: '/staff', label: 'Início', icon: 'home' },
			{ href: '/staff/pos', label: 'Caixa', icon: 'cart', roles: FRONT },
			{ href: '/staff/orders', label: 'Pedidos', icon: 'list' },
			{ href: '/kitchen', label: 'Cozinha', icon: 'chef' },
			{ href: '/staff/reconciliation', label: 'Caixa do dia', icon: 'cash', roles: MANAGER }
		]
	},
	{
		label: 'Cardápio',
		links: [
			{ href: '/staff/menu', label: 'Disponibilidade', icon: 'check', roles: FRONT },
			{
				href: '/staff/menu/edit',
				label: 'Produtos e adicionais',
				icon: 'burger',
				roles: MANAGER,
				match: ['/staff/menu/products', '/staff/menu/groups']
			},
			{ href: '/staff/menu/pages', label: 'Páginas do site', icon: 'book', roles: MANAGER }
		]
	},
	{
		label: 'Loja',
		links: [
			{ href: '/staff/settings/store', label: 'Funcionamento', icon: 'clock', roles: MANAGER },
			{ href: '/staff/settings/profile', label: 'Dados e Pix', icon: 'store', roles: MANAGER },
			{ href: '/staff/settings/delivery', label: 'Entrega', icon: 'truck', roles: MANAGER },
			{ href: '/staff/settings/integrations', label: 'Integrações', icon: 'grid', roles: MANAGER }
		]
	},
	{
		label: 'Gestão',
		links: [
			{ href: '/staff/analytics', label: 'Relatórios', icon: 'chart', roles: MANAGER },
			{ href: '/staff/settings/staff', label: 'Equipe', icon: 'users', roles: MANAGER },
			{ href: '/staff/setup', label: 'Configuração inicial', icon: 'settings', roles: ['owner'] }
		]
	}
];

export function navFor(role: StaffRole): NavGroup[] {
	return GROUPS.map((g) => ({
		label: g.label,
		links: g.links
			.filter((l) => !l.roles || l.roles.includes(role))
			.map(({ href, label, icon, match }) => ({ href, label, icon, match }))
	})).filter((g) => g.links.length > 0);
}

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
