import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// H4: automated accessibility scan on the core public routes, and a reduced-motion run of the home hero.
const routes = ['/', '/cardapio', '/conta/entrar', '/staff/login'];

for (const route of routes) {
	test(`${route} has no serious or critical accessibility issues`, async ({ page }) => {
		await page.goto(route);
		await page.waitForLoadState('networkidle');

		const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
		const serious = results.violations.filter(
			(v) => v.impact === 'serious' || v.impact === 'critical'
		);
		expect(
			serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`),
			`serious or critical issues on ${route}`
		).toEqual([]);
	});
}

test('home hero stays still under reduced motion', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	// GSAP never runs, so the hero layers are not left hidden waiting for an intro animation.
	const bg = page.locator('[data-hero-bg]').first();
	const burger = page.locator('[data-hero-burger]').first();
	await expect(bg).toBeVisible();
	await expect(burger).toBeVisible();
	await expect(bg).not.toHaveCSS('opacity', '0');
	await expect(burger).not.toHaveCSS('opacity', '0');
});
