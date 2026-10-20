import { fail } from '@sveltejs/kit';
import { attempt, formString } from '#lib/server/actions.ts';
import { MANAGERS, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { uploadMenuImage } from '#lib/server/catalog/images.ts';
import {
	COLOR_KEYS,
	DEFAULT_COLORS,
	getBranding,
	IMAGE_KEYS,
	saveColors,
	setBrandImage,
	type ColorKey,
	type ImageKey
} from '#lib/server/settings/branding.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, MANAGERS);
	return { look: await getBranding(undefined, { fresh: true }), defaults: DEFAULT_COLORS };
};

function imageKey(d: FormData): ImageKey | null {
	const k = formString(d, 'image');
	return (IMAGE_KEYS as readonly string[]).includes(k) ? (k as ImageKey) : null;
}

export const actions: Actions = {
	colors: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		const d = await event.request.formData();
		const colors = Object.fromEntries(
			COLOR_KEYS.map((k) => [k, formString(d, k) || null])
		) as Record<ColorKey, string | null>;
		return attempt(async () => {
			await saveColors(colors, staffActor(staff));
			return { ok: 'Cores salvas.' };
		});
	},
	resetColors: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		return attempt(async () => {
			await saveColors({ primary: null, dark: null, background: null }, staffActor(staff));
			return { ok: 'Cores padrão de volta.' };
		});
	},
	upload: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		const d = await event.request.formData();
		const key = imageKey(d);
		const file = d.get('file');
		if (!key) return fail(400, { error: 'Imagem desconhecida.' });
		if (!(file instanceof File) || file.size === 0)
			return fail(400, { error: 'Escolha uma imagem.' });
		return attempt(async () => {
			await setBrandImage(key, await uploadMenuImage(file), staffActor(staff));
			return { ok: 'Imagem trocada.' };
		});
	},
	resetImage: async (event) => {
		const staff = requireStaff(event, MANAGERS);
		const key = imageKey(await event.request.formData());
		if (!key) return fail(400, { error: 'Imagem desconhecida.' });
		return attempt(async () => {
			await setBrandImage(key, null, staffActor(staff));
			return { ok: 'Imagem padrão de volta.' };
		});
	}
};
