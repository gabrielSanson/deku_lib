// Smoke test for a running self-hosted stack: staff login, then a counter order
// must reach an open kitchen screen through Supabase Realtime (not polling).
//   SHOP_URL=https://localhost:8443 OWNER_EMAIL=… OWNER_PASSWORD=… node tests/selfhost/realtime-check.mjs
import { chromium } from '@playwright/test';

const url = process.env.SHOP_URL ?? 'https://localhost:8443';
const b = await chromium.launch(
	process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}
);
const ctx = await b.newContext({
	ignoreHTTPSErrors: true,
	viewport: { width: 1180, height: 820 },
	serviceWorkers: 'block'
});
const kitchen = await ctx.newPage();
let pushed = false;
kitchen.on('websocket', (w) =>
	w.on('framereceived', (f) => {
		if (String(f.payload).includes('"postgres_changes"') && String(f.payload).includes('INSERT'))
			pushed = true;
	})
);
await kitchen.goto(`${url}/staff/login?next=/kitchen`);
await kitchen.waitForLoadState('networkidle');
await kitchen.getByLabel('E-mail').fill(process.env.OWNER_EMAIL);
await kitchen.getByLabel('Senha').fill(process.env.OWNER_PASSWORD);
await kitchen.getByRole('button', { name: 'Entrar' }).click();
await kitchen.waitForURL(/\/kitchen/);
await kitchen.waitForTimeout(3000);

const pos = await ctx.newPage();
await pos.goto(`${url}/staff/pos`);
await pos.waitForLoadState('networkidle');
const label = `RT ${Date.now() % 100000}`;
await pos.getByRole('button', { name: /Batata frita/ }).click();
await pos.getByLabel('Nome ou mesa').fill(label);
await pos.getByRole('button', { name: 'Cobrar' }).click();
await pos.waitForURL(/\/payment$/);

const started = Date.now();
await kitchen.getByText(label).first().waitFor({ timeout: 7000 });
console.log(JSON.stringify({ realtimePush: pushed, kitchenUpdatedMs: Date.now() - started }));
await b.close();
if (!pushed) process.exit(1);
