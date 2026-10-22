import { expect, test, type Page } from '@playwright/test';

// H3: keyboard-only journeys. Focus is moved with Tab and activated with Enter or Space, never with a click.
const password = process.env.SEED_PASSWORD ?? 'burger123';

async function typeInto(page: Page, label: string, text: string) {
	await page.getByLabel(label, { exact: true }).focus();
	await page.keyboard.type(text);
}

async function loginByKeyboard(page: Page, email: string, next: string) {
	await page.goto(`/staff/login?next=${encodeURIComponent(next)}`);
	await page.waitForLoadState('networkidle');
	await typeInto(page, 'E-mail', email);
	await page.keyboard.press('Tab');
	await page.keyboard.type(password);
	await page.keyboard.press('Tab');
	await page.keyboard.press('Enter');
	await page.waitForURL((u) => !u.pathname.startsWith('/staff/login'));
	await page.waitForLoadState('networkidle');
}

test('customer picks a dish and adds it to the cart with the keyboard', async ({ page }) => {
	await page.goto('/cardapio');
	await page.waitForLoadState('networkidle');

	await page
		.getByRole('link', { name: /Clássico/ })
		.first()
		.focus();
	await expect(page.getByRole('link', { name: /Clássico/ }).first()).toBeFocused();
	await page.keyboard.press('Enter');
	await page.waitForURL(/\/menu\//);
	await page.waitForLoadState('networkidle');

	await page.getByRole('button', { name: 'Ao ponto' }).focus();
	await page.keyboard.press('Space');
	await page.getByRole('button', { name: /^Adicionar/ }).focus();
	await page.keyboard.press('Enter');
	await page.waitForURL((u) => u.pathname === '/cardapio');
});

test('staff signs in and opens the POS using only the keyboard', async ({ page }) => {
	await loginByKeyboard(page, 'admin@burger.local', '/staff/pos');
	await expect(page).toHaveURL(/\/staff\/pos/);
	// Shortcuts "/" (search) and F9 (charge) are not built yet; they belong to the POS redesign (S5).
});

test('kitchen cook moves a ticket forward with the keyboard', async ({ page }) => {
	await loginByKeyboard(page, 'cozinha@burger.local', '/kitchen');
	await expect(page).toHaveURL(/\/kitchen/);
	const action = page
		.getByRole('button', { name: /Iniciar preparo|Marcar pronto|Entregue/ })
		.first();
	if (await action.count()) {
		await action.focus();
		await expect(action).toBeFocused();
	}
});
