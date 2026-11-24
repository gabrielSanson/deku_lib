// Menu photos live in a private "menu" bucket in (self-hosted) Supabase Storage.
// Staff upload through the server, and the app serves them from /media/menu/,
// so the browser never needs a Storage key and the URL is the same everywhere.
// Each shop's photos are in its own folder (<shop_id>/<hash>); photos the default shop
// uploaded before many-shops support stay at the bucket's top level and are still found.
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseServerUrl } from '../config';
import { currentShopId, DEFAULT_SHOP_ID } from '../db';
import { DomainError } from '../errors';

const BUCKET = 'menu';
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, { ext: string; magic: (b: Uint8Array) => boolean }> = {
	'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
	'image/png': {
		ext: 'png',
		magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
	},
	'image/webp': {
		ext: 'webp',
		magic: (b) =>
			String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
			String.fromCharCode(...b.slice(8, 12)) === 'WEBP'
	}
};
export const IMAGE_PATH = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

/** Built-in sample photos of a shop preset (static/presets/<name>/...), set only by the sample menu. */
export const PRESET_IMAGE_PATH = /^presets\/[a-z0-9-]+\/[a-z0-9/-]+\.(svg|webp|png|jpg)$/;

/** The sample menu's photo for the database: "/presets/x/y.svg" → "presets/x/y.svg". */
export function presetImagePath(url: string | null | undefined): string | null {
	const path = url?.replace(/^\//, '') ?? null;
	return path && PRESET_IMAGE_PATH.test(path) ? path : null;
}

export function menuImageUrl(path: string | null): string | null {
	if (path && PRESET_IMAGE_PATH.test(path)) return `/${path}`;
	return path && IMAGE_PATH.test(path) ? `/media/menu/${path}` : null;
}

function storage() {
	const url = supabaseServerUrl();
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		throw new DomainError('err.image.noStorage', { code: 'no_storage', status: 501 });
	}
	return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
		.storage;
}

/** Checks the file really is a small JPEG/PNG/WebP, then stores it under its content hash. */
export async function uploadMenuImage(file: File): Promise<string> {
	if (file.size === 0) throw new DomainError('err.image.missing');
	if (file.size > MAX_BYTES) throw new DomainError('err.image.tooBig');
	const type = TYPES[file.type];
	const bytes = new Uint8Array(await file.arrayBuffer());
	if (!type || !type.magic(bytes)) throw new DomainError('err.image.type');
	const path = `${createHash('sha256').update(bytes).digest('hex').slice(0, 32)}.${type.ext}`;
	const s = storage();
	const created = await s.createBucket(BUCKET, {
		public: false,
		fileSizeLimit: MAX_BYTES,
		allowedMimeTypes: Object.keys(TYPES)
	});
	if (created.error && !/exist/i.test(created.error.message)) {
		throw new DomainError('err.image.bucket', { vars: { detail: created.error.message } });
	}
	const { error } = await s
		.from(BUCKET)
		.upload(`${currentShopId()}/${path}`, bytes, { contentType: file.type, upsert: true });
	if (error) throw new DomainError('err.image.upload', { vars: { detail: error.message } });
	return path;
}

/** A photo of the current shop (never another shop's, even with the same file name). */
export async function downloadMenuImage(path: string): Promise<Blob | null> {
	if (!IMAGE_PATH.test(path)) return null;
	const bucket = storage().from(BUCKET);
	const shopId = currentShopId();
	const own = await bucket.download(`${shopId}/${path}`);
	if (!own.error) return own.data;
	if (shopId !== DEFAULT_SHOP_ID) return null;
	const old = await bucket.download(path);
	return old.error ? null : old.data;
}
