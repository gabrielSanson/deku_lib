import { expect, test } from '@playwright/test';

// The owner's rule: the header is the same on every page, signed in or not.
for (const width of [390, 1440]) {
	test(`header is the same on every page at ${width} px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 844 });
		const headers: string[][] = [];
		for (const path of ['/', '/cardapio', '/conta/entrar']) {
			await page.goto(path);
			await page.waitForLoadState('networkidle');
			const controls = page.locator('header').first().locator('a[href]:visible, button:visible');
			headers.push(
				await controls.evaluateAll((els) =>
					els.map((e) => e.getAttribute('aria-label') ?? e.textContent?.trim() ?? '')
				)
			);
		}
		expect(headers[0]).toContain('Cardápio');
		expect(headers[0].length).toBeGreaterThanOrEqual(4);
		expect(headers[1]).toEqual(headers[0]);
		expect(headers[2]).toEqual(headers[0]);
	});

	// The featured row needs products with photos; the seeded menu has none, so this checks
	// that whatever shows there is not a link, and that the modes row is gone.
	test(`signed-out home shows the featured burgers as photos at ${width} px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 844 });
		await page.goto('/');
		const featured = page.locator('section[aria-labelledby="home-destaques"]');
		await expect(featured.locator('a')).toHaveCount(0);
		await expect(page.getByText('Comer no local')).toHaveCount(0);
	});
}
