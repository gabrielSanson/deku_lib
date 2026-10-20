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
	return {
		plugins: [
			tailwindcss(),
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},
				adapter: adapter()
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
						env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' },
						fileParallelism: false,
						testTimeout: 20000,
						hookTimeout: 30000
					}
				}
			]
		}
	};
});
