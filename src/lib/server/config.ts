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
	SHOP_NAME: z.string().default('Deku Burger'),
	SHOP_TIMEZONE: z.string().default('America/Sao_Paulo'),
	DIRECTUS_URL: z.string().url().optional(),
	DIRECTUS_TOKEN: z.string().optional(),
	CMS_WEBHOOK_SECRET: z.string().min(16).optional(),
	PAYMENT_PROVIDER: z.enum(['none', 'local_stub']).default('none'),
	IFOOD_ENABLED: flag,
	IFOOD_CLIENT_ID: z.string().optional(),
	IFOOD_CLIENT_SECRET: z.string().optional(),
	IFOOD_MERCHANT_ID: z.string().optional(),
	IFOOD_API_BASE: z.string().url().default('https://merchant-api.ifood.com.br'),
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
		cached = parsed;
	}
	return cached;
}

export function resetConfigForTests() {
	cached = undefined;
}
