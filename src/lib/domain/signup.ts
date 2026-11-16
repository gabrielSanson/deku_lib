// Rules for a new shop on the hosted platform: its address (slug) and business type.
import { slugify } from './slug';

export const BUSINESS_TYPES = [
	'lanchonete',
	'hamburgueria',
	'pizzaria',
	'acai',
	'cafeteria',
	'restaurante'
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const SLUG_RULE = /^[a-z0-9][a-z0-9-]{1,39}$/;

/** Names the platform itself uses, so no shop can take them. */
export const RESERVED_SLUGS = new Set([
	'www',
	'api',
	'app',
	'admin',
	'plataforma',
	'platform',
	'painel',
	'staff',
	'equipe',
	'suporte',
	'ajuda',
	'status',
	'mail',
	'email',
	'smtp',
	'static',
	'cdn',
	'media',
	'auth',
	'login',
	'conta',
	'blog',
	'docs',
	'teste',
	'test',
	'demo'
]);

export type SlugProblem = 'format' | 'reserved';

/** Why a slug cannot be used, or null when it is fine (availability is checked separately). */
export function slugProblem(slug: string): SlugProblem | null {
	if (!SLUG_RULE.test(slug) || slug.endsWith('-') || slug.includes('--')) return 'format';
	if (RESERVED_SLUGS.has(slug)) return 'reserved';
	return null;
}

/** "Lanchonete do Zé" → "lanchonete-do-ze" (at most 40 characters). */
export function suggestSlug(shopName: string): string {
	const s = slugify(shopName, 40);
	return s.length >= 2 ? s : `${s || 'loja'}-1`.slice(0, 40);
}
