// Walks a fresh self-hosted stack through the owner's first day: setup wizard,
// menu editor with a photo, Pix to the shop's key, and staff confirming that Pix.
//   SHOP_URL=https://localhost:8443 OWNER_EMAIL=… OWNER_PASSWORD=… node tests/selfhost/setup-check.mjs
// SHOTS=<dir> also saves screenshots of the main screens.
import { chromium } from '@playwright/test';

const url = process.env.SHOP_URL ?? 'https://localhost:8443';
const shots = process.env.SHOTS;
const b = await chromium.launch(
	process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}
);
const ctx = await b.newContext({ ignoreHTTPSErrors: true, serviceWorkers: 'block' });
const page = await ctx.newPage();
const step = (msg) => console.log(`✓ ${msg}`);
const shot = (name) => shots && page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
const ok = async (cond, msg) => {
	if (!(await cond)) throw new Error(`FAILED: ${msg}`);
	step(msg);
};

await page.goto(`${url}/staff/login`);
await page.getByLabel('E-mail').fill(process.env.OWNER_EMAIL);
await page.getByLabel('Senha').fill(process.env.OWNER_PASSWORD);
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForURL(/\/staff$/);
await ok(
	page.getByText('Falta terminar a configuração').isVisible(),
	'home points to the setup wizard'
);

await page.getByRole('link', { name: 'Continuar configuração' }).click();
await page.getByLabel('Nome da loja').fill('Deku Burger Teste');
await page.getByLabel('Cidade').fill('São Paulo');
await page.getByRole('button', { name: 'Salvar e continuar' }).click();
await page.waitForURL(/passo=cardapio/);
step('store details saved');

if (await page.getByRole('button', { name: 'Carregar cardápio de exemplo' }).isVisible()) {
	await page.getByRole('button', { name: 'Carregar cardápio de exemplo' }).click();
	await page.getByText(/Cardápio de exemplo carregado/).waitFor();
	step('sample menu loaded');
}

// Menu editor: photo on an existing product, and a new product.
await page.goto(`${url}/staff/menu/edit`);
await page.getByRole('link', { name: /Clássico/ }).click();
// 1x1 PNG
const png = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64'
);
await page.setInputFiles('input[name=photo]', {
	name: 'burger.png',
	mimeType: 'image/png',
	buffer: png
});
await page.getByLabel('Preço (R$)').fill('31,90');
await page.getByRole('button', { name: 'Salvar' }).click();
await page.getByText('Salvo.').waitFor();
await page.reload();
const img = await page.locator('form img').getAttribute('src');
const photo = await ctx.request.get(new URL(img, url).toString());
await ok(
	photo.ok() && photo.headers()['content-type'] === 'image/png',
	`photo uploaded and served from ${img}`
);
await shot('menu-product');

await page.goto(`${url}/staff/menu/products/novo`);
await page.getByLabel('Nome').fill('Milkshake Teste');
await page.getByLabel('Preço (R$)').fill('18,50');
await page.getByLabel('Categoria', { exact: true }).selectOption('bebidas');
await page.getByRole('button', { name: 'Salvar' }).click();
await page.waitForURL(/products\/MILKSHAKE-TESTE/);
step('new product created');

await page.goto(`${url}/staff/setup?passo=entrega`);
await page.getByRole('button', { name: 'Salvar e continuar' }).click();
await page.waitForURL(/passo=equipe/);
step('pickup and delivery saved');

await page.goto(`${url}/staff/setup?passo=pagamentos`);
await page.getByLabel(/Pix na chave da loja/).check();
await page.getByLabel('Chave Pix').fill('loja@exemplo.com.br');
await page.getByLabel('Cidade do recebedor').fill('Sao Paulo');
await page.getByRole('button', { name: 'Salvar e continuar' }).click();
await page.waitForURL(/passo=ifood/);
step('Pix key saved');

await page.getByLabel('Client ID').fill('cliente-de-teste');
await page.getByLabel('Client Secret').fill('segredo-de-teste');
await page.getByLabel('Merchant ID').fill('00000000-0000-0000-0000-000000000000');
await page.getByRole('button', { name: 'Salvar e testar' }).click();
const alert = page.locator('.alert-error[role=alert]');
await alert.waitFor({ timeout: 30_000 });
console.log(
	`  iFood test result shown to the owner: ${(await alert.locator('p').allInnerTexts()).join(' / ')}`
);
await ok(
	page
		.getByRole('button', { name: /Ligar recebimento automático/ })
		.count()
		.then((n) => n === 0),
	'iFood cannot be turned on after a failed test'
);
await shot('setup-ifood');

await page.goto(`${url}/staff/setup?passo=concluir`);
await page.getByLabel(/Abrir a loja/).check();
await page.getByRole('button', { name: 'Concluir configuração' }).click();
await page.waitForURL(/\/staff$/);
await ok(
	page
		.getByText('Falta terminar a configuração')
		.count()
		.then((n) => n === 0),
	'setup finished, store open'
);

// Customer pays by Pix to the shop's key.
const customer = await ctx.newPage();
await customer.goto(`${url}/`);
await customer.waitForLoadState('networkidle');
await customer
	.getByRole('link', { name: /Milkshake Teste/ })
	.first()
	.click();
await customer.waitForURL(/\/menu\//);
await customer.waitForLoadState('networkidle');
await customer.getByRole('button', { name: /^Adicionar/ }).click();
await customer.waitForURL((u) => u.pathname === '/');
await customer.goto(`${url}/checkout`);
await customer.waitForLoadState('networkidle');
await customer.getByRole('button', { name: 'Retirar na loja' }).click();
await customer.getByLabel('Nome').fill('Cliente Pix');
await customer.getByLabel('Celular (WhatsApp)').fill('(11) 98765-4321');
await customer.getByRole('radio', { name: /^Pix/ }).check();
await customer.getByText('R$ 18,50').last().waitFor();
await customer.getByRole('button', { name: 'Ir para o pagamento' }).click();
await customer.waitForURL(/\/checkout\/payment\//);
await customer.getByText('Aguardando a loja confirmar o Pix').waitFor();
await ok(customer.locator('svg').first().isVisible(), 'customer sees the Pix QR code');
if (shots) await customer.screenshot({ path: `${shots}/customer-pix.png`, fullPage: true });
const orderNumber = (await customer.getByRole('heading', { level: 1 }).innerText()).replace(
	/\D/g,
	''
);

// Staff confirm the Pix and accept the order.
await page.goto(`${url}/staff/orders?status=new`);
await page
	.getByRole('link', { name: new RegExp(`#${orderNumber}`) })
	.first()
	.click();
await page.getByText(`PEDIDO${orderNumber}`).waitFor();
await shot('staff-pix-order');
await page.getByRole('link', { name: 'Registrar Pix recebido' }).click();
await page.waitForURL(/method=external_pix/);
await page.locator('input[name=reference]').fill(`E2E${Date.now()}`);
await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
// The customer's payment page polls and moves on once the order is paid.
await customer.waitForURL(/\/orders\//, { timeout: 20_000 });
step(`staff recorded the Pix for order #${orderNumber}; the customer's page moved on`);

await b.close();
console.log('setup check passed');
