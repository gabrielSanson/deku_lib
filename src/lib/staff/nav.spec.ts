import { describe, expect, it } from 'vitest';
import { activeHref, NAV, navFor } from './nav';

describe('admin navigation', () => {
	it('marks the most specific link as active', () => {
		expect(activeHref(NAV, '/staff')).toBe('/staff');
		expect(activeHref(NAV, '/staff/orders/123')).toBe('/staff/orders');
		expect(activeHref(NAV, '/staff/menu')).toBe('/staff/menu');
		expect(activeHref(NAV, '/staff/menu/edit')).toBe('/staff/menu/edit');
		expect(activeHref(NAV, '/staff/menu/products/X-BURGER')).toBe('/staff/menu/edit');
		expect(activeHref(NAV, '/staff/menuzinho')).toBeNull();
		expect(activeHref(NAV, '/staff/settings/hours')).toBe('/staff/settings/store');
		expect(activeHref(NAV, '/staff/settings/staff')).toBe('/staff/settings/staff');
	});
});

describe('navFor', () => {
	it('gives admins the whole menu', () => {
		expect(navFor('admin')).toBe(NAV);
	});

	it('gives attendants only the counter, orders and kitchen', () => {
		const hrefs = navFor('attendant').flatMap((g) => g.links.map((l) => l.href));
		expect(hrefs.sort()).toEqual(['/kitchen', '/staff', '/staff/orders', '/staff/pos']);
	});
});
