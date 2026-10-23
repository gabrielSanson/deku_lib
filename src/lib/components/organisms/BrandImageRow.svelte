<script lang="ts">
	// One replaceable shop image (logo, icon, home photo) with its preview, an upload form and
	// "use the default". Used by Aparência and Página inicial; both post to ?/upload.
	import { enhance } from '$app/forms';
	import FileField from '#lib/components/molecules/FileField.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let {
		key,
		label,
		hint,
		src,
		custom,
		frameClass = 'grid size-20 place-items-center p-2',
		imgClass = 'object-contain'
	}: {
		/** The image slot the server knows (logo, heroImage, ...). */
		key: string;
		label: string;
		hint: string;
		src: string;
		/** The owner uploaded their own image, so "use the default" is offered. */
		custom: boolean;
		/** Size of the dark preview box. */
		frameClass?: string;
		imgClass?: string;
	} = $props();

	const t = useTexts();
</script>

<li class="flex flex-wrap items-center gap-4 py-4">
	<div class="shrink-0 overflow-hidden rounded-lg bg-night {frameClass}">
		<img {src} alt="" class="size-full {imgClass}" />
	</div>
	<div class="min-w-48 flex-1">
		<p class="font-medium">
			{label}
			{#if !custom}<span class="text-xs font-normal text-muted">{t('look.default')}</span>{/if}
		</p>
		<p class="text-xs text-muted">{hint}</p>
	</div>
	<form
		method="POST"
		action="?/upload"
		enctype="multipart/form-data"
		class="flex flex-wrap items-center gap-2"
		use:enhance
	>
		<input type="hidden" name="image" value={key} />
		<FileField
			label={t('look.newImage', { name: label })}
			hideLabel
			id="upload-{key}"
			name="file"
			accept="image/png,image/jpeg,image/webp"
			class="max-w-56"
			required
		/>
		<button class="btn-secondary">{t('look.upload')}</button>
		{#if custom}
			<button class="btn-ghost" formaction="?/resetImage" formnovalidate
				>{t('look.useDefault')}</button
			>
		{/if}
	</form>
</li>
