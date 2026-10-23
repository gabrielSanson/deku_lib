import { expect, test } from '@playwright/test';

// The owner's rule: a visitor who is not signed in sees only Início and Cardápio on the home page.
for (const width of [390, 1440]) {
	test(`signed-out home at ${width} px offers only Início and Cardápio`, async ({ page }) => {
		await page.setViewportSize({ width, height: 844 });
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		const controls = page.locator('a[href]:visible, button:visible, [role="button"]:visible');
		await expect(controls).toHaveText(['Início', 'Cardápio']);
	});
}
