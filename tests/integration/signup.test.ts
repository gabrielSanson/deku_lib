// S1.3: a shop owner signs up and the shop is ready to sell.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resetConfigForTests } from '#lib/server/config.ts';
import { closeDb, platformDb, withShop } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { getCatalog } from '#lib/server/catalog/service.ts';
import { createShop, slugAvailable, type SignupInput } from '#lib/server/platform/signup.ts';
import { getStoreSettings } from '#lib/server/settings/service.ts';
import { getTexts } from '#lib/server/settings/texts.ts';

const removed: string[] = [];
const auth = {
	create: async () => {
		const [u] = await platformDb()<{ id: string }[]>`
			insert into auth.users (email) values (${`${randomUUID()}@signup.test`}) returning id`;
		return u.id;
	},
	remove: async (id: string) => {
		removed.push(id);
	}
};

function input(over: Partial<SignupInput> = {}): SignupInput {
	return {
		ownerName: 'Maria',
		email: 'maria@example.com',
		password: 'senha-forte-123',
		shopName: 'Pizzaria da Maria',
		slug: `maria-${randomUUID().slice(0, 6)}`,
		businessType: 'pizzaria',
		city: 'Campinas',
		acceptTerms: true,
		ip: '203.0.113.9',
		...over
	};
}

beforeAll(() => {
	process.env.TENANCY = 'multi';
	process.env.PLATFORM_DOMAIN = 'plataforma.test';
	resetConfigForTests();
});

afterAll(async () => {
	delete process.env.TENANCY;
	delete process.env.PLATFORM_DOMAIN;
	resetConfigForTests();
	await stopBoss();
	await closeDb();
});

describe('creating a shop', () => {
	it('sets up the shop, its address, owner, terms and a starting menu for its type', async () => {
		const s = await createShop(input({ slug: 'pizzaria-da-maria' }), auth);
		expect(s.host).toBe('pizzaria-da-maria.plataforma.test');
		const [shop] =
			await platformDb()`select status, business_type, trial_ends_at > now() + interval '29 days' as trial
			from shops where id = ${s.shopId}`;
		expect(shop).toEqual({ status: 'trial', business_type: 'pizzaria', trial: true });
		const [member] =
			await platformDb()`select role from shop_members where shop_id = ${s.shopId} and user_id = ${s.userId}`;
		expect(member.role).toBe('admin');
		const terms =
			await platformDb()`select document from terms_acceptances where shop_id = ${s.shopId} order by document`;
		expect(terms.map((t) => t.document)).toEqual(['dpa', 'privacy', 'terms']);
		const [catalog, settings, texts] = await withShop(s.shopId, async () => [
			await getCatalog({ fresh: true }),
			await getStoreSettings(),
			await getTexts(undefined, { fresh: true })
		]);
		expect(
			(catalog as Awaited<ReturnType<typeof getCatalog>>).products.map((p) => p.sku)
		).toContain('PIZ-MUSSARELA');
		expect((settings as Awaited<ReturnType<typeof getStoreSettings>>).dineInEnabled).toBe(false);
		expect((texts as Record<string, string>)['home.metaDescription']).toMatch(/pizza/);
		expect(await slugAvailable('pizzaria-da-maria')).toBe(false);
	});

	it('refuses a taken, reserved or badly written address and missing terms', async () => {
		await expect(createShop(input({ slug: 'pizzaria-da-maria' }), auth)).rejects.toMatchObject({
			code: 'slug_taken'
		});
		await expect(createShop(input({ slug: 'www' }), auth)).rejects.toMatchObject({
			key: 'err.signup.slugReserved'
		});
		await expect(createShop(input({ slug: 'Ma ria' }), auth)).rejects.toMatchObject({
			key: 'err.signup.slugFormat'
		});
		await expect(createShop(input({ acceptTerms: false }), auth)).rejects.toMatchObject({
			key: 'err.signup.terms'
		});
	});

	it('removes the account and frees the address when the shop cannot be saved', async () => {
		const slug = `quebra-${randomUUID().slice(0, 6)}`;
		await expect(
			createShop(input({ slug, businessType: 'sorveteria' as never }), auth)
		).rejects.toMatchObject({ key: 'err.signup.businessType' });
		// A failure after the account exists: an account id the database does not know.
		const before = removed.length;
		const broken = { ...auth, create: async () => randomUUID() };
		await expect(createShop(input({ slug }), broken)).rejects.toMatchObject({
			key: 'err.signup.failed'
		});
		expect(removed.length).toBe(before + 1);
		expect(await slugAvailable(slug)).toBe(true);
	});
});
