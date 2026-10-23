import { describe, expect, it } from 'vitest';
import { activeHref, NAV, navFor, SETTINGS_GROUPS } from './nav';

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
	it('gives admins the whole menu', () => {
		expect(navFor('admin')).toBe(NAV);
	});

	it('gives attendants only the counter, drawer, orders and kitchen', () => {
		const hrefs = navFor('attendant').flatMap((g) => g.links.map((l) => l.href));
		expect(hrefs.sort()).toEqual([
			'/kitchen',
			'/staff',
			'/staff/caixa',
			'/staff/orders',
			'/staff/pos'
		]);
	});
});
