import { attempt, failText, formString, shopText } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { uploadMenuImage } from '#lib/server/catalog/images.ts';
import {
	COLOR_KEYS,
	defaultColors,
	getBranding,
	IMAGE_KEYS,
	saveColors,
	setBrandImage,
	type ColorKey,
	type ImageKey
} from '#lib/server/settings/branding.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	return { look: await getBranding(undefined, { fresh: true }), defaults: defaultColors() };
};

function imageKey(d: FormData): ImageKey | null {
	const k = formString(d, 'image');
	return (IMAGE_KEYS as readonly string[]).includes(k) ? (k as ImageKey) : null;
}

export const actions: Actions = {
	colors: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const colors = Object.fromEntries(
			COLOR_KEYS.map((k) => [k, formString(d, k) || null])
		) as Record<ColorKey, string | null>;
		return attempt(async () => {
			await saveColors(colors, staffActor(staff));
			return { ok: await shopText('ok.colorsSaved') };
		});
	},
	resetColors: async (event) => {
		const staff = requireStaff(event, ADMIN);
		return attempt(async () => {
			await saveColors({ primary: null, dark: null, background: null }, staffActor(staff));
			return { ok: await shopText('ok.colorsReset') };
		});
	},
	upload: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const key = imageKey(d);
		const file = d.get('file');
		if (!key) return failText(400, 'err.image.unknown');
		if (!(file instanceof File) || file.size === 0) return failText(400, 'err.image.pick');
		return attempt(async () => {
			await setBrandImage(key, await uploadMenuImage(file), staffActor(staff));
			return { ok: await shopText('ok.imageChanged') };
		});
	},
	resetImage: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const key = imageKey(await event.request.formData());
		if (!key) return failText(400, 'err.image.unknown');
		return attempt(async () => {
			await setBrandImage(key, null, staffActor(staff));
			return { ok: await shopText('ok.imageReset') };
		});
	}
};
