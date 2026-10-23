import { fail } from '@sveltejs/kit';
import { attempt, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { getCatalog } from '#lib/server/catalog/service.ts';
import { uploadMenuImage } from '#lib/server/catalog/images.ts';
import { listPages } from '#lib/server/catalog/pages.ts';
import { getBranding, saveHome, setBrandImage } from '#lib/server/settings/branding.ts';
import { validateHome } from '#lib/server/settings/home.ts';
import { listTextsForEditor, saveTexts } from '#lib/server/settings/texts.ts';
import type { TextKey } from '#lib/texts/catalog.ts';
import type { Actions, PageServerLoad } from './$types';

// The home page's own texts, edited here next to the layout (they also show in Textos do site).
const HERO_TEXTS: TextKey[] = [
	'home.hero.eyebrow',
	'home.hero.title',
	'home.hero.phoneTitle',
	'home.hero.text',
	'home.hero.cta',
	'home.hero.cta2'
];
const BLOCK_TEXTS: TextKey[] = [
	'home.featured.eyebrow',
	'home.featured.title',
	'home.featured.seeAll',
	'home.menuButton'
];
const IMAGES = ['heroImage', 'heroLogo'] as const;
type HomeImage = (typeof IMAGES)[number];

function imageKey(d: FormData): HomeImage | null {
	const k = formString(d, 'image');
	return (IMAGES as readonly string[]).includes(k) ? (k as HomeImage) : null;
}

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const [look, catalog, groups, pages] = await Promise.all([
		getBranding(undefined, { fresh: true }),
		getCatalog({ fresh: true }),
		listTextsForEditor(),
		listPages()
	]);
	const texts = new Map(groups.flatMap((g) => g.texts).map((x) => [x.key, x]));
	const pick = (keys: TextKey[]) => keys.map((k) => texts.get(k)!);
	return {
		look,
		categories: catalog.categories
			.slice()
			.sort((a, b) => a.position - b.position)
			.map((c) => ({ id: c.id, name: c.name })),
		heroTexts: pick(HERO_TEXTS),
		blockTexts: pick(BLOCK_TEXTS),
		// Suggestions for the button links.
		links: ['/cardapio', '/conta', ...pages.filter((p) => p.published).map((p) => `/p/${p.slug}`)]
	};
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const on = (k: string) => d.get(k) === 'on';
		const texts = Object.fromEntries(
			[...HERO_TEXTS, ...BLOCK_TEXTS].map((k) => [k, formString(d, `t:${k}`)])
		);
		return attempt(async () => {
			const layout = validateHome({
				heroAlign: formString(d, 'heroAlign'),
				heroSize: formString(d, 'heroSize'),
				heroCutout: on('heroCutout'),
				showStatus: on('showStatus'),
				showModes: on('showModes'),
				primaryHref: formString(d, 'primaryHref'),
				secondaryHref: formString(d, 'secondaryHref'),
				showFeatured: on('showFeatured'),
				featuredCategoryId: formString(d, 'featuredCategoryId'),
				featuredCount: Number(formString(d, 'featuredCount')),
				showMenuButton: on('showMenuButton')
			});
			await saveTexts(texts, staffActor(staff));
			await saveHome(layout, staffActor(staff));
			return { ok: true };
		});
	},
	upload: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const key = imageKey(d);
		const file = d.get('file');
		if (!key) return fail(400, { error: 'Imagem desconhecida.' });
		if (!(file instanceof File) || file.size === 0)
			return fail(400, { error: 'Escolha uma imagem.' });
		return attempt(async () => {
			await setBrandImage(key, await uploadMenuImage(file), staffActor(staff));
			return { image: 'Imagem trocada.' };
		});
	},
	resetImage: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const key = imageKey(await event.request.formData());
		if (!key) return fail(400, { error: 'Imagem desconhecida.' });
		return attempt(async () => {
			await setBrandImage(key, null, staffActor(staff));
			return { image: 'Imagem padrão de volta.' };
		});
	}
};
