import { defineConfig } from '@playwright/test';

// End-to-end tests run against a dev server backed by local Supabase with seed data
// (see README). Set E2E_BASE_URL to reuse an already running server.
export default defineConfig({
	testDir: 'tests/e2e',
	timeout: 30_000,
	use: {
		baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
		locale: 'pt-BR',
		timezoneId: 'America/Sao_Paulo',
		launchOptions: process.env.PW_CHROMIUM_PATH
			? { executablePath: process.env.PW_CHROMIUM_PATH }
			: {}
	},
	webServer: process.env.E2E_BASE_URL
		? undefined
		: { command: 'pnpm dev --port 5173', port: 5173, reuseExistingServer: true },
	projects: [
		{ name: 'tablet', use: { viewport: { width: 1180, height: 820 } } },
		{ name: 'phone', use: { viewport: { width: 390, height: 844 } }, grep: /@phone/ }
	]
});
