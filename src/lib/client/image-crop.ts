/**
 * Centre-crops a picked photo to the 4:3 shape the menu cards use and shrinks it, so a phone photo
 * of 8 MB fits the upload limit and no card shows the dish cut off. Returns the original file when
 * the browser cannot decode or encode it.
 */
export async function cropTo43(file: File, maxWidth = 1600): Promise<File> {
	if (!file.type.startsWith('image/')) return file;
	try {
		const bitmap = await createImageBitmap(file);
		const ratio = 4 / 3;
		let sw = bitmap.width;
		let sh = Math.round(sw / ratio);
		if (sh > bitmap.height) {
			sh = bitmap.height;
			sw = Math.round(sh * ratio);
		}
		const sx = Math.round((bitmap.width - sw) / 2);
		const sy = Math.round((bitmap.height - sh) / 2);
		const width = Math.min(maxWidth, sw);
		const height = Math.round(width / ratio);
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		if (!ctx) return file;
		ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
		bitmap.close();
		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, 'image/webp', 0.85)
		);
		if (!blob || blob.type !== 'image/webp') return file;
		return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
	} catch {
		return file;
	}
}
