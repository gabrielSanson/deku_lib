import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig(({ mode }) => {
	// Server code reads process.env (shared with the worker); load .env for dev/preview.
	if (mode !== 'test') {
		for (const [k, v] of Object.entries(loadEnv(mode, process.cwd(), ''))) process.env[k] ??= v;
	}
	// https: and wss: already cover hosted Supabase; a plain-http local Supabase must be listed.
	const supabase = process.env.PUBLIC_SUPABASE_URL ?? '';
	const localSupabase = supabase.startsWith('http://')
		? [supabase, supabase.replace(/^http/, 'ws')]
		: [];
	return {
		plugins: [
			tailwindcss(),
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},
				adapter: adapter(),
				// Set ORIGIN at build time when the app is not served over https behind a proxy.
				paths: { origin: process.env.ORIGIN || undefined },
				csp: {
					mode: 'auto',
					directives: {
						'default-src': ['self'],
						'script-src': ['self'],
						// Svelte writes inline style attributes for transitions.
						'style-src': ['self', 'unsafe-inline'],
						// Menu photos are served by the app itself (/media/menu); QR codes are inline SVG.
						'img-src': ['self', 'data:', 'blob:', 'https:'],
						'font-src': ['self'],
						// Supabase Realtime (wss) and Auth for the staff screens.
						'connect-src': [
							'self',
							'https:',
							'wss:',
							...(localSupabase as `http://localhost:${number}`[])
						],
						'worker-src': ['self'],
						'manifest-src': ['self'],
						'frame-ancestors': ['none'],
						'base-uri': ['self'],
						'form-action': ['self'],
						'object-src': ['none']
					}
				}
			})
		],
		test: {
			expect: { requireAssertions: true },
			projects: [
				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts}'],
						exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
					}
				},
				{
					extends: './vite.config.ts',
					test: {
						name: 'integration',
						environment: 'node',
						include: ['tests/integration/**/*.test.ts'],
						globalSetup: ['tests/integration/setup.ts'],
						env: {
							DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
							APP_SECRET: 'integration-tests-only-app-secret-0123456789'
						},
						fileParallelism: false,
						testTimeout: 20000,
						hookTimeout: 30000
					}
				}
			]
		}
	};
});
