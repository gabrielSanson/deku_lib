import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// H4: automated accessibility scan on the core public routes, and a reduced-motion run of the home hero.
const routes = ['/', '/cardapio', '/conta/entrar', '/staff/login'];

for (const route of routes) {
	test(`${route} has no serious or critical accessibility issues`, async ({ page }) => {
		await page.goto(route);
		await page.waitForLoadState('networkidle');
		// Scan the settled page: the hero fades its copy in, and a half-faded button looks low-contrast.
		await page.waitForFunction(() =>
			[...document.querySelectorAll('[data-hero-in], [data-hero-bg]')].every(
				(el) => getComputedStyle(el).opacity === '1'
			)
		);

		const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
		const serious = results.violations.filter(
			(v) => v.impact === 'serious' || v.impact === 'critical'
		);
		// Print the failing elements to the job log, so the cause is visible without downloading the report.
		for (const v of serious) {
			for (const n of v.nodes) {
				console.log(`[axe] ${route} ${v.id} ${n.target.join(' ')} :: ${n.html.slice(0, 300)}`);
				console.log(`[axe] ${route} ${v.id} summary :: ${n.failureSummary?.replace(/\s+/g, ' ')}`);
			}
		}
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
	await expect(bg).toBeVisible();
	await expect(bg).not.toHaveCSS('opacity', '0');
});
