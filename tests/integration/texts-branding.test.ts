// Customer-facing texts and the shop's look, edited by the owner.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { attempt } from '#lib/server/actions.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { DomainError } from '#lib/server/errors.ts';
import {
	getBranding,
	saveColors,
	saveHome,
	setBrandImage,
	themeCss
} from '#lib/server/settings/branding.ts';
import { DEFAULT_HOME } from '#lib/server/settings/home.ts';
import { getTexts, listTextsForEditor, saveTexts } from '#lib/server/settings/texts.ts';
import { makeStaff } from './helpers.ts';

let owner: Awaited<ReturnType<typeof makeStaff>>;

beforeAll(async () => {
	owner = await makeStaff('admin');
});

afterAll(async () => {
	await db()`delete from ui_texts`;
	await db()`update store_branding set color_primary = null, color_dark = null,
		color_background = null, logo_path = null, wordmark_path = null, hero_logo_path = null,
		icon_path = null where id = 1`;
	await closeDb();
});

describe('texts', () => {
	it('serves the defaults until the owner edits a text', async () => {
		const t = await getTexts(db(), { fresh: true });
		expect(t['errors.offline']).toBe('Você está sem conexão.');
	});

	it('stores only changed texts and goes back to the default when emptied', async () => {
		await saveTexts(
			{
				'home.hero.cta': 'Quero o meu',
				'errors.offline': 'Você está sem conexão.',
				'not.a.key': 'ignored'
			},
			owner
		);
		const rows = await db()<{ key: string }[]>`select key from ui_texts order by key`;
		expect(rows.map((r) => r.key)).toEqual(['home.hero.cta']);
		expect((await getTexts())['home.hero.cta']).toBe('Quero o meu');

		const editor = await listTextsForEditor();
		const cta = editor.flatMap((g) => g.texts).find((x) => x.key === 'home.hero.cta');
		expect(cta).toMatchObject({ changed: true, value: 'Quero o meu', default: 'Ver cardápio' });

		await saveTexts({ 'home.hero.cta': '  ' }, owner);
		expect((await getTexts())['home.hero.cta']).toBe('Ver cardápio');
		const [audit] = await db()<{ summary: { reset: string[] } }[]>`
			select summary from audit_log where action = 'store.texts_updated' order by id desc limit 1`;
		expect(audit.summary.reset).toEqual(['home.hero.cta']);
	});

	it('keeps the {names} the app fills in', async () => {
		await expect(
			saveTexts({ 'home.hero.prepTime': 'Fica pronto rapidinho' }, owner)
		).rejects.toThrow(DomainError);
		await expect(saveTexts({ 'footer.tagline': 'Oi {name}' }, owner)).rejects.toThrow(
			/não pode ter palavras entre chaves/
		);
		await saveTexts({ 'home.hero.prepTime': 'Pronto em {minutes} minutinhos' }, owner);
		expect((await getTexts())['home.hero.prepTime']).toBe('Pronto em {minutes} minutinhos');
	});

	it("shows the owner's wording for a refused form", async () => {
		const refuse = () =>
			attempt(async () => {
				throw new DomainError('err.cash.overdraw');
			});
		expect(await refuse()).toMatchObject({
			status: 400,
			data: { error: 'A sangria é maior que o dinheiro na gaveta.', code: 'invalid' }
		});
		await saveTexts({ 'err.cash.overdraw': 'Não tem tanto dinheiro na gaveta.' }, owner);
		expect(await refuse()).toMatchObject({
			data: { error: 'Não tem tanto dinheiro na gaveta.' }
		});
		const priced = await attempt(async () => {
			throw new DomainError('err.order.badTransition', { vars: { from: 'ready', to: 'new' } });
		});
		expect(priced).toMatchObject({ data: { error: 'Não é possível mudar de ready para new.' } });
	});
});

describe('branding', () => {
	it('falls back to the built-in brand', async () => {
		const b = await getBranding(db(), { fresh: true });
		expect(b.colors).toEqual({ primary: null, dark: null, background: null });
		expect(b.images.logo).toBe('/brand/deku-mark.png');
		expect(themeCss(b.colors)).toBe('');
	});

	it('saves colours, treating the default as no change', async () => {
		await saveColors({ primary: '#E63946', dark: '#0b0b0b', background: null }, owner);
		const b = await getBranding();
		expect(b.colors).toEqual({ primary: '#e63946', dark: null, background: null });
		const css = themeCss(b.colors);
		expect(css).toContain('--color-brand-500:#e63946');
		expect(css).not.toContain('--color-night:');
		await expect(
			saveColors({ primary: 'red;}body{display:none', dark: null, background: null }, owner)
		).rejects.toThrow(DomainError);
	});

	it('refuses colours that leave text unreadable and says which', async () => {
		await expect(
			saveColors({ primary: '#1d3557', dark: null, background: null }, owner)
		).rejects.toThrow(/texto preto na cor principal \(botões\) \(\d,\d:1\)/);
		expect((await getBranding(db(), { fresh: true })).colors.primary).toBe('#e63946');
	});

	it('uses an uploaded logo and goes back to the default', async () => {
		const path = `${'a'.repeat(32)}.png`;
		await setBrandImage('logo', path, owner);
		let b = await getBranding();
		expect(b.images.logo).toBe(`/media/menu/${path}`);
		expect(b.custom.logo).toBe(true);
		await expect(setBrandImage('icon', '../etc/passwd', owner)).rejects.toThrow(DomainError);
		await setBrandImage('logo', null, owner);
		b = await getBranding();
		expect(b.images.logo).toBe('/brand/deku-mark.png');
	});

	it('uses the home photo on the sign-in page until the owner picks one', async () => {
		const hero = `${'b'.repeat(32)}.jpg`;
		const login = `${'c'.repeat(32)}.webp`;
		let b = await getBranding(db(), { fresh: true });
		expect(b.images.loginImage).toBe(b.images.heroImage);
		expect(b.images.staffBackground).toBe('/hero/background-1920.webp');
		await setBrandImage('heroImage', hero, owner);
		b = await getBranding();
		expect(b.images.loginImage).toBe(`/media/menu/${hero}`);
		expect(b.custom.loginImage).toBe(false);
		await setBrandImage('loginImage', login, owner);
		await setBrandImage('staffBackground', login, owner);
		b = await getBranding();
		expect(b.images.loginImage).toBe(`/media/menu/${login}`);
		expect(b.images.staffBackground).toBe(`/media/menu/${login}`);
		for (const key of ['heroImage', 'loginImage', 'staffBackground'] as const)
			await setBrandImage(key, null, owner);
	});

	it('saves the home layout and reads it back', async () => {
		expect((await getBranding(db(), { fresh: true })).home.heroAlign).toBe('left');
		await saveHome({ ...DEFAULT_HOME, heroAlign: 'center', secondaryHref: '/p/sobre' }, owner);
		const b = await getBranding();
		expect(b.home).toMatchObject({ heroAlign: 'center', secondaryHref: '/p/sobre' });
		expect(b.images.heroImage).toBe('/hero/banner-1920.webp');
	});
});
