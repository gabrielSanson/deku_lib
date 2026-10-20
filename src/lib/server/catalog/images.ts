// Menu photos live in a private "menu" bucket in (self-hosted) Supabase Storage.
// Staff upload through the server, and the app serves them from /media/menu/,
// so the browser never needs a Storage key and the URL is the same everywhere.
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseServerUrl } from '../config';
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

export function menuImageUrl(path: string | null): string | null {
	return path && IMAGE_PATH.test(path) ? `/media/menu/${path}` : null;
}

function storage() {
	const url = supabaseServerUrl();
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		throw new DomainError(
			'O envio de fotos precisa do Supabase Storage configurado no servidor.',
			'no_storage',
			501
		);
	}
	return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
		.storage;
}

/** Checks the file really is a small JPEG/PNG/WebP, then stores it under its content hash. */
export async function uploadMenuImage(file: File): Promise<string> {
	if (file.size === 0) throw new DomainError('Escolha uma foto.');
	if (file.size > MAX_BYTES) throw new DomainError('A foto pode ter no máximo 5 MB.');
	const type = TYPES[file.type];
	const bytes = new Uint8Array(await file.arrayBuffer());
	if (!type || !type.magic(bytes)) throw new DomainError('Envie uma foto JPG, PNG ou WebP.');
	const path = `${createHash('sha256').update(bytes).digest('hex').slice(0, 32)}.${type.ext}`;
	const s = storage();
	const created = await s.createBucket(BUCKET, {
		public: false,
		fileSizeLimit: MAX_BYTES,
		allowedMimeTypes: Object.keys(TYPES)
	});
	if (created.error && !/exist/i.test(created.error.message)) {
		throw new DomainError(`Não foi possível preparar o armazenamento: ${created.error.message}`);
	}
	const { error } = await s
		.from(BUCKET)
		.upload(path, bytes, { contentType: file.type, upsert: true });
	if (error) throw new DomainError(`Não foi possível enviar a foto: ${error.message}`);
	return path;
}

export async function downloadMenuImage(path: string): Promise<Blob | null> {
	if (!IMAGE_PATH.test(path)) return null;
	const { data, error } = await storage().from(BUCKET).download(path);
	return error ? null : data;
}
