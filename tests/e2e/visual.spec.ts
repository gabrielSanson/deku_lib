import { expect, test } from '@playwright/test';

// H1: screenshots of the core public screens at a phone and a desktop width, attached to each run next to
// the mockup they should match (tests/visual/mockups). Pixel baselines wait for the owner's sign-off (Q1).
const screens = [
	{ route: '/', mockups: ['01-storefront-home.jpg', '03-customer-mobile-app.jpg'] },
	{ route: '/cardapio', mockups: ['02-full-menu-categories.jpg'] },
	{ route: '/conta/entrar', mockups: ['08-login-signup.jpg'] },
	{ route: '/staff/login', mockups: [] as string[] }
];
const widths = [390, 1440];

for (const { route, mockups } of screens) {
	for (const width of widths) {
		test(`${route} at ${width} px is captured for review`, async ({ page }, testInfo) => {
			await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
			await page.goto(route);
			await page.waitForLoadState('networkidle');
			await expect(page.locator('h1').first()).toBeAttached();

			const shot = await page.screenshot({ fullPage: true });
			await testInfo.attach(`${route}-${width}.png`, { body: shot, contentType: 'image/png' });
			for (const name of mockups) {
				testInfo.annotations.push({ type: 'mockup', description: `tests/visual/mockups/${name}` });
			}
		});
	}
}
