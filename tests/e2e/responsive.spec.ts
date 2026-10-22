import { expect, test } from '@playwright/test';

// H2: core public screens at five widths. At 320 px nothing may scroll sideways.
const widths = [320, 640, 768, 1024, 1440];
const routes = ['/', '/cardapio', '/conta/entrar', '/staff/login'];

for (const route of routes) {
	test(`${route} lays out at every width without sideways scroll at 320 px`, async ({ page }) => {
		for (const width of widths) {
			await page.setViewportSize({ width, height: 800 });
			await page.goto(route);
			await page.waitForLoadState('networkidle');
			// Some screens keep a mobile-only h1 (hidden from lg up), so check it is in the page, not that it shows.
			await expect(page.locator('h1').first()).toBeAttached();

			if (width === 320) {
				const overflow = await page.evaluate(
					() => document.documentElement.scrollWidth - document.documentElement.clientWidth
				);
				expect(overflow, `horizontal overflow at 320 px on ${route}`).toBeLessThanOrEqual(0);
			}
		}
	});
}
