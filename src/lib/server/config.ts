// Runtime configuration, read from process.env so the web app and the worker
// share one definition. Integrations stay off unless explicitly configured.
import { z } from 'zod';

const flag = z
	.enum(['true', 'false', '1', '0'])
	.default('false')
	.transform((v) => v === 'true' || v === '1');

const schema = z.object({
	NODE_ENV: z.string().default('development'),
	DATABASE_URL: z.string().min(1),
	PUBLIC_SUPABASE_URL: z.string().url().optional(),
	PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
	// Self-hosted: how the server reaches the Supabase gateway on the private network.
	SUPABASE_INTERNAL_URL: z.string().url().optional(),
	SHOP_NAME: z.string().default('Deku Burger'),
	SHOP_TIMEZONE: z.string().default('America/Sao_Paulo'),
	// Encrypts secrets the owner saves in the app (the iFood client secret).
	APP_SECRET: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(32).optional()),
	PAYMENT_PROVIDER: z.enum(['none', 'local_stub']).default('none'),
	IFOOD_ENABLED: flag,
	IFOOD_CLIENT_ID: z.string().optional(),
	IFOOD_CLIENT_SECRET: z.string().optional(),
	IFOOD_MERCHANT_ID: z.string().optional(),
	IFOOD_API_BASE: z.string().url().default('https://merchant-api.ifood.com.br'),
	// Shows the Google button on the customer login. Enable it in Supabase Auth first.
	GOOGLE_LOGIN_ENABLED: flag,
	PRINT_AGENT_TOKEN: z.string().optional()
});

export type Config = z.infer<typeof schema>;

let cached: Config | undefined;

export function config(): Config {
	if (!cached) {
		const parsed = schema.parse(process.env);
		const production = parsed.NODE_ENV === 'production';
		if (production && parsed.PAYMENT_PROVIDER === 'local_stub') {
			throw new Error('The local payment stub cannot run in production');
		}
		if (production && parsed.APP_SECRET?.startsWith('local-development-only')) {
			throw new Error('APP_SECRET is the development placeholder; generate a real one');
		}
		cached = parsed;
	}
	return cached;
}

export function resetConfigForTests() {
	cached = undefined;
}

/** URL the server uses for Supabase: the private gateway when self-hosted, else the public one. */
export function supabaseServerUrl(): string | undefined {
	const c = config();
	return c.SUPABASE_INTERNAL_URL ?? c.PUBLIC_SUPABASE_URL;
}
