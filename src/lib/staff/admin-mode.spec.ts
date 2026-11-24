import { describe, expect, it } from 'vitest';
import { groupsForMode, pathAllowed } from './admin-mode';
import { NAV, SETTINGS_GROUPS } from './nav';

describe('simple staff area', () => {
	it('keeps orders, the menu, the basic settings and confirming a Pix', () => {
		for (const path of [
			'/staff',
			'/staff/orders',
			'/staff/orders/3f0c1a2e-1111-4222-8333-444455556666',
			'/staff/menu',
			'/staff/menu/edit',
			'/staff/menu/products/novo',
			'/staff/settings/payments',
			'/staff/settings/home',
			'/staff/setup',
			'/staff/login',
			'/staff/seguranca/verificar',
			'/staff/pos/3f0c1a2e-1111-4222-8333-444455556666/payment'
		]) {
			expect(pathAllowed('simple', path), path).toBe(true);
		}
	});

	it('switches the back office off', () => {
		for (const path of [
			'/staff/pos',
			'/staff/caixa',
			'/staff/reconciliation',
			'/staff/estoque',
			'/staff/analytics',
			'/staff/campaigns',
			'/staff/despesas',
			'/staff/menu/ingredients',
			'/staff/menu/precos',
			'/staff/settings/ifood',
			'/staff/settings/fiscal',
			'/staff/settingsx',
			'/kitchen',
			'/painel'
		]) {
			expect(pathAllowed('simple', path), path).toBe(false);
		}
	});

	it('leaves the storefront and the full mode alone', () => {
		expect(pathAllowed('simple', '/')).toBe(true);
		expect(pathAllowed('simple', '/checkout')).toBe(true);
		expect(pathAllowed('simple', '/staffing')).toBe(true);
		expect(pathAllowed('full', '/staff/caixa')).toBe(true);
	});

	it('menus only list pages that open', () => {
		const links = groupsForMode([...NAV, ...SETTINGS_GROUPS], 'simple').flatMap((g) => g.links);
		expect(links.map((l) => l.href)).toContain('/staff/orders');
		expect(links.map((l) => l.href)).not.toContain('/staff/settings/plano');
		for (const l of links) expect(pathAllowed('simple', l.href), l.href).toBe(true);
		expect(groupsForMode(NAV, 'full')).toBe(NAV);
	});
});
