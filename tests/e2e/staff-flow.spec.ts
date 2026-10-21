import { expect, test, type Page } from '@playwright/test';

const password = process.env.SEED_PASSWORD ?? 'burger123';

async function login(page: Page, email: string, next?: string) {
	await page.goto('/staff/login');
	await page.getByLabel('E-mail').fill(email);
	await page.getByLabel('Senha').fill(password);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await page.waitForURL((u) => !u.pathname.startsWith('/staff/login'));
	if (next) await page.goto(next);
	await page.waitForLoadState('networkidle'); // wait for hydration before tapping
}

test('admin sells at the counter and the kitchen completes it', async ({ page, browser }) => {
	await login(page, 'admin@burger.local', '/staff/pos');

	await page.getByRole('button', { name: /Bacon Cheddar/ }).click();
	const sheet = page.getByRole('dialog');
	await expect(sheet.getByRole('button', { name: /Escolha Ponto/ })).toBeDisabled();
	await sheet.getByRole('button', { name: 'Ao ponto' }).click();
	await sheet.getByRole('button', { name: /Bacon.*R\$/ }).click();
	await sheet.getByRole('button', { name: 'Cebola caramelizada' }).click();
	await sheet.getByRole('button', { name: /Adicionar/ }).click();
	await page.getByRole('button', { name: /Batata frita/ }).click();
	await page.getByLabel('Nome ou mesa').fill('Ana');
	// 34,90 + 5,00 bacon + 14,90 fritas
	await expect(page.getByText('R$ 54,80').last()).toBeVisible();
	await page.getByRole('button', { name: 'Cobrar' }).click();

	await page.waitForURL(/\/payment$/);
	await page.getByLabel('Valor recebido (R$)').fill('60');
	await expect(page.getByText(/Troco:/)).toContainText('5,20');
	await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
	await expect(page.getByText('Pagamento confirmado.')).toBeVisible();
	await page.getByRole('button', { name: 'Continuar' }).click();
	await page.waitForURL(/\/complete$/);
	const orderNumber = (await page.locator('p.text-7xl').textContent())!.trim();

	const kitchenCtx = await browser.newContext();
	const kitchen = await kitchenCtx.newPage();
	await login(kitchen, 'cozinha@burger.local', '/kitchen');
	const card = kitchen.locator('article', { hasText: orderNumber });
	await expect(card).toContainText('Sem cebola');
	await card.getByRole('button', { name: 'Iniciar' }).click();
	await expect(
		kitchen
			.locator('section', { hasText: 'Em preparo' })
			.locator('article', { hasText: orderNumber })
	).toBeVisible();
	await kitchen
		.locator('article', { hasText: orderNumber })
		.getByRole('button', { name: 'Pronto' })
		.click();
	await expect(
		kitchen.locator('section', { hasText: 'Prontos' }).locator('article', { hasText: orderNumber })
	).toBeVisible();

	// The admin's order list picks up the kitchen's change without a reload.
	await page.goto('/staff/orders?status=ready');
	await expect(page.getByRole('link', { name: orderNumber })).toBeVisible();
	await kitchenCtx.close();
});

test('kitchen staff only get the kitchen screen', async ({ page }) => {
	await login(page, 'cozinha@burger.local');
	await expect(page).toHaveURL(/\/kitchen$/);
	await page.goto('/staff/pos');
	await expect(page).toHaveURL(/\/kitchen$/);
});
