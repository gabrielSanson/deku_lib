import { expect, test, type Page } from '@playwright/test';

const password = process.env.SEED_PASSWORD ?? 'burger123';

async function login(page: Page, email: string, next = '/staff') {
	await page.goto(`/staff/login?next=${encodeURIComponent(next)}`);
	await page.getByLabel('E-mail').fill(email);
	await page.getByLabel('Senha', { exact: true }).fill(password);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await page.waitForURL((u) => !u.pathname.startsWith('/staff/login'));
	await page.waitForLoadState('networkidle'); // wait for hydration before tapping
}

/** Cash sales need an open drawer; open it with no float unless an earlier run did. */
async function openDrawer(page: Page) {
	await page.goto('/staff/caixa');
	await page.waitForLoadState('networkidle');
	const open = page.getByRole('button', { name: 'Abrir caixa' });
	if (await open.isVisible()) {
		await page.getByLabel('Fundo de troco (R$)').fill('0');
		await open.click();
		await expect(open).toBeHidden();
	}
}

test('admin sells at the counter and the kitchen completes it', async ({ page, browser }) => {
	await login(page, 'admin@burger.local', '/staff/caixa');
	await openDrawer(page);
	await page.goto('/staff/pos');
	await page.waitForLoadState('networkidle');

	await page.getByRole('button', { name: /Bacon Cheddar/ }).click();
	const sheet = page.getByRole('dialog');
	await expect(sheet.getByRole('button', { name: /Escolha Ponto/ })).toBeDisabled();
	await sheet.getByRole('button', { name: 'Ao ponto' }).click();
	await sheet.getByRole('button', { name: /Bacon.*R\$/ }).click();
	await sheet.getByRole('button', { name: 'Cebola caramelizada' }).click();
	await sheet.getByRole('button', { name: /Adicionar/ }).click();
	await page.getByRole('button', { name: /Batata frita/ }).click();
	await page.getByLabel('Nome', { exact: true }).fill('Ana');
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
	// The full number shows small beside the code; staff call the last 3 digits.
	const orderNumber = (await page.getByTestId('pickup-code').textContent())!.replace(/\D/g, '');
	const code = orderNumber.slice(-3);

	const kitchenCtx = await browser.newContext();
	const kitchen = await kitchenCtx.newPage();
	await login(kitchen, 'cozinha@burger.local', '/kitchen');
	const card = kitchen.locator('article', { hasText: orderNumber });
	await expect(card).toContainText('Sem cebola');
	await card.getByRole('button', { name: 'Iniciar' }).click();
	await expect(
		kitchen
			.locator('section', { hasText: 'Preparando' })
			.locator('article', { hasText: orderNumber })
	).toBeVisible();
	await kitchen
		.locator('article', { hasText: orderNumber })
		.getByRole('button', { name: 'Pronto' })
		.click();
	await expect(
		kitchen.locator('section', { hasText: 'Pronto' }).locator('article', { hasText: orderNumber })
	).toBeVisible();

	// The admin's order list picks up the kitchen's change without a reload.
	await page.goto('/staff/orders?status=ready');
	await expect(page.getByRole('link', { name: orderNumber })).toBeVisible();

	// The attendant calls the code out and taps "Chamar"; the board shows when it was called.
	await page.waitForLoadState('networkidle'); // wait for hydration before tapping
	await page.getByRole('button', { name: new RegExp(`Chamar ${code}`) }).click();
	await expect(
		page
			.getByRole('listitem')
			.filter({ hasText: `#${orderNumber}` })
			.getByText(/Chamado às/)
	).toBeVisible();
	await expect(
		kitchen.locator('article', { hasText: orderNumber }).getByText(/Chamado às/)
	).toBeVisible({ timeout: 15_000 });
	await kitchenCtx.close();
});

test('kitchen staff only get the kitchen screen', async ({ page }) => {
	await login(page, 'cozinha@burger.local');
	await page.goto('/staff/pos');
	await expect(page).toHaveURL(/\/kitchen$/);
});
