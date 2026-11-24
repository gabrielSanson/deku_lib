// How much of the staff area a shop uses. "full" is the whole back office (caixa, cozinha,
// estoque, relatórios, nota fiscal, integrações...). "simple" is for a small shop that only
// sells online, like a cookie shop: see and confirm orders, edit the menu and set up the site.
// The simple list is an allowlist, so new back-office pages stay hidden there by default.
import type { NavGroup } from './nav';

export type AdminMode = 'full' | 'simple';
export const ADMIN_MODES: readonly AdminMode[] = ['full', 'simple'];

/** Screens outside /staff that belong to the back office (kitchen TV, courier, pickup board, kiosk). */
const BACK_OFFICE = /^\/(staff|kitchen|entregador|painel|totem)(\/|$)/;

/** Pages a simple shop keeps. Each entry also opens the pages under it. */
const SIMPLE_ALLOWED = [
	'/staff/login',
	'/staff/logout',
	'/staff/lojas',
	'/staff/ver-como',
	'/staff/print',
	'/staff/orders',
	'/staff/menu/edit',
	'/staff/menu/products',
	'/staff/menu/groups',
	'/staff/menu/importar',
	'/staff/seguranca',
	'/staff/setup',
	'/staff/settings/profile',
	'/staff/settings/hours',
	'/staff/settings/staff',
	'/staff/settings/store',
	'/staff/settings/delivery',
	'/staff/settings/home',
	'/staff/settings/appearance',
	'/staff/settings/texts',
	'/staff/settings/pages',
	'/staff/settings/payments',
	// Backups and disk alerts on the dashboard link here.
	'/staff/settings/system',
	'/staff/settings/plano'
];

/** Exact pages: the dashboard, availability, and taking payment for one order (confirming a Pix). */
const SIMPLE_EXACT = [
	/^\/staff$/,
	/^\/staff\/menu$/,
	/^\/staff\/pos\/[0-9a-f-]{36}\/(payment|complete)$/
];

/** Pages hidden from the menus but still reachable (a suspended shop's billing page). */
const SIMPLE_UNLISTED = ['/staff/settings/plano'];

export function pathAllowed(mode: AdminMode, path: string): boolean {
	if (mode === 'full' || !BACK_OFFICE.test(path)) return true;
	const clean = path.length > 1 ? path.replace(/\/$/, '') : path;
	if (SIMPLE_EXACT.some((re) => re.test(clean))) return true;
	return SIMPLE_ALLOWED.some((p) => clean === p || clean.startsWith(p + '/'));
}

/** Menu groups with only the links this mode keeps. */
export function groupsForMode(groups: NavGroup[], mode: AdminMode): NavGroup[] {
	if (mode === 'full') return groups;
	return groups
		.map((g) => ({
			...g,
			links: g.links.filter((l) => pathAllowed(mode, l.href) && !SIMPLE_UNLISTED.includes(l.href))
		}))
		.filter((g) => g.links.length);
}

/** Setup wizard steps a simple shop skips. */
export const SIMPLE_SKIPPED_STEPS = ['ifood'] as const;
