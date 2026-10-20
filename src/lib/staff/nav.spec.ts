import { describe, expect, it } from 'vitest';
import { activeHref, navFor } from './nav';

const hrefs = (role: Parameters<typeof navFor>[0]) =>
	navFor(role).flatMap((g) => g.links.map((l) => l.href));

describe('staff navigation', () => {
	it('shows kitchen staff only the shift screens', () => {
		expect(hrefs('kitchen')).toEqual(['/staff', '/staff/orders', '/kitchen']);
	});

	it('keeps back-office links for managers, and the setup wizard for owners', () => {
		expect(hrefs('cashier')).not.toContain('/staff/analytics');
		expect(hrefs('manager')).toContain('/staff/analytics');
		expect(hrefs('manager')).not.toContain('/staff/setup');
		expect(hrefs('owner')).toContain('/staff/setup');
	});

	it('marks the most specific link as active', () => {
		const nav = navFor('owner');
		expect(activeHref(nav, '/staff')).toBe('/staff');
		expect(activeHref(nav, '/staff/orders/123')).toBe('/staff/orders');
		expect(activeHref(nav, '/staff/menu')).toBe('/staff/menu');
		expect(activeHref(nav, '/staff/menu/edit')).toBe('/staff/menu/edit');
		expect(activeHref(nav, '/staff/menu/products/X-BURGER')).toBe('/staff/menu/edit');
		expect(activeHref(nav, '/staff/menuzinho')).toBeNull();
	});
});
