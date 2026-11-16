import { describe, expect, it } from 'vitest';
import { defaultPermissions } from '#lib/domain/permissions.ts';
import { activeHref, filterGroups, NAV, navFor, SETTINGS_GROUPS } from './nav';

describe('admin navigation', () => {
	it('marks the most specific link as active', () => {
		expect(activeHref(NAV, '/staff')).toBe('/staff');
		expect(activeHref(NAV, '/staff/orders/123')).toBe('/staff/orders');
		expect(activeHref(NAV, '/staff/menu')).toBe('/staff/menu');
		expect(activeHref(NAV, '/staff/menu/edit')).toBe('/staff/menu/edit');
		expect(activeHref(NAV, '/staff/menu/products/X-BURGER')).toBe('/staff/menu/edit');
		expect(activeHref(NAV, '/staff/menuzinho')).toBeNull();
		expect(activeHref(NAV, '/staff/settings/hours')).toBe('/staff/settings/profile');
		expect(activeHref(NAV, '/staff/settings/staff')).toBe('/staff/settings/profile');
		expect(activeHref(NAV, '/staff/setup')).toBe('/staff/settings/profile');
	});
});

describe('settings groups', () => {
	it('lists every settings page once', () => {
		const hrefs = SETTINGS_GROUPS.flatMap((g) => g.links.map((l) => l.href));
		expect(new Set(hrefs).size).toBe(hrefs.length);
		expect(SETTINGS_GROUPS).toHaveLength(4);
	});

	it('keeps each page in one place of the main menu', () => {
		const main = NAV.flatMap((g) => g.links.map((l) => l.href));
		for (const link of SETTINGS_GROUPS.flatMap((g) => g.links)) {
			if (link.href === '/staff/settings/profile') continue;
			expect(main).not.toContain(link.href);
		}
	});
});

describe('navFor', () => {
	it('gives the owner the whole menu', () => {
		expect(navFor({ permissions: defaultPermissions('admin') })).toEqual(NAV);
	});

	it('gives attendants the counter, drawer, orders, deliveries, availability, kitchen and time clock', () => {
		const hrefs = navFor({ permissions: defaultPermissions('attendant') }).flatMap((g) =>
			g.links.map((l) => l.href)
		);
		expect(hrefs.sort()).toEqual([
			'/kitchen',
			'/staff',
			'/staff/caixa',
			'/staff/entregas',
			'/staff/menu',
			'/staff/orders',
			'/staff/ponto',
			'/staff/pos',
			'/staff/reconciliation'
		]);
	});

	it('hides settings pages a member cannot open', () => {
		const groups = filterGroups(SETTINGS_GROUPS, ['settings.edit']);
		const hrefs = groups.flatMap((g) => g.links.map((l) => l.href));
		expect(hrefs).toContain('/staff/settings/hours');
		expect(hrefs).not.toContain('/staff/settings/staff');
		expect(hrefs).not.toContain('/staff/settings/fiscal');
	});
});
