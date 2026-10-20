// Menu photos from the private Storage bucket. File names are content hashes,
// so a response never changes and can be cached for a year.
import { error } from '@sveltejs/kit';
import { downloadMenuImage, IMAGE_PATH } from '#lib/server/catalog/images.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!IMAGE_PATH.test(params.file)) error(404, 'Foto não encontrada.');
	const blob = await downloadMenuImage(params.file).catch(() => null);
	if (!blob) error(404, 'Foto não encontrada.');
	const ext = params.file.split('.').pop();
	return new Response(blob, {
		headers: {
			'content-type': ext === 'jpg' ? 'image/jpeg' : `image/${ext}`,
			'cache-control': 'public, max-age=31536000, immutable',
			'x-content-type-options': 'nosniff'
		}
	});
};
