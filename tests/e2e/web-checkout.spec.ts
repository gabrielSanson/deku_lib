import { expect, test } from '@playwright/test';

// Needs PAYMENT_PROVIDER=local_stub on the dev server and `pnpm worker` running.
test('customer orders on the site, pays with Pix and the order reaches the kitchen @phone', async ({ page }) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');
	await page.getByRole('link', { name: /Clássico/ }).first().click();
	await page.waitForURL(/\/menu\//);
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Ao ponto' }).click();
	await page.getByRole('button', { name: /^Adicionar/ }).click();
	await page.waitForURL((u) => u.pathname === '/');

	await page.goto('/checkout');
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Retirar na loja' }).click();
	await page.getByLabel('Nome').fill('Cliente Teste');
	await page.getByLabel('Celular (WhatsApp)').fill('(11) 98765-4321');
	await page.getByRole('radio', { name: /^Pix/ }).check();
	await expect(page.getByText('Total', { exact: true })).toBeVisible();
	await expect(page.getByText('R$ 28,90').last()).toBeVisible();
	await page.getByRole('button', { name: 'Ir para o pagamento' }).click();

	await page.waitForURL(/\/checkout\/payment\//);
	await expect(page.getByRole('button', { name: /Copiar código Pix/ })).toBeVisible();
	await page.getByRole('button', { name: 'Simular pagamento aprovado' }).click();

	// The worker applies the webhook; the page polls and moves to the order status.
	await page.waitForURL(/\/orders\//, { timeout: 20_000 });
	await expect(page.locator('[aria-current="step"]')).toHaveText(/Confirmado/, { timeout: 15_000 });
});
