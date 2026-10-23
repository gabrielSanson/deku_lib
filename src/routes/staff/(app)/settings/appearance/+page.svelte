<script lang="ts">
	import GuardedForm from '#lib/components/organisms/GuardedForm.svelte';
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const look = $derived(data.look);

	// Follows the saved colours, and the colour pickers edit it locally until saved.
	let colors = $derived({
		primary: look.colors.primary ?? data.defaults.primary,
		dark: look.colors.dark ?? data.defaults.dark,
		background: look.colors.background ?? data.defaults.background
	});

	const colorFields = [
		{ key: 'primary', label: t('look.primary'), hint: t('look.primaryHint') },
		{ key: 'dark', label: t('look.dark'), hint: t('look.darkHint') },
		{ key: 'background', label: t('look.background'), hint: t('look.backgroundHint') }
	] as const;
	const imageFields = [
		{ key: 'logo', label: t('look.logo'), hint: t('look.logoHint') },
		{ key: 'wordmark', label: t('look.wordmark'), hint: t('look.wordmarkHint') },
		{ key: 'heroLogo', label: t('look.heroLogo'), hint: t('look.heroLogoHint') },
		{ key: 'icon', label: t('look.icon'), hint: t('look.iconHint') }
	] as const;
</script>

<svelte:head><title>{t('look.tabTitle')}</title></svelte:head>

<div class="space-y-4">
	<header class="space-y-1">
		<h1 class="page-title">{t('look.title')}</h1>
		<p class="text-sm text-muted">
			{t('look.introBefore')}
			<a class="underline" href="/staff/settings/texts">{t('look.textsLink')}</a>{t(
				'look.introMiddle'
			)}
			<a class="underline" href="/staff/menu/edit">{t('look.menuLink')}</a>.
		</p>
	</header>

	<FormError message={form?.error} />
	{#if form?.ok}<p class="alert-ok">{form.ok}</p>{/if}

	<!-- Preview of the shop header with the chosen colours -->
	<div class="overflow-hidden rounded-xl ring-1 ring-line" aria-hidden="true">
		<div class="flex items-center gap-3 px-4 py-3" style="background:{colors.dark}">
			<img src={look.images.logo} alt="" class="h-10 w-auto" />
			<img src={look.images.wordmark} alt="" class="h-6 w-auto" />
			<span
				class="ml-auto rounded-full px-4 py-2 text-sm font-bold text-black"
				style="background:{colors.primary}">{t('look.previewCta')}</span
			>
		</div>
		<div class="p-4 text-sm" style="background:{colors.background}">
			{t('look.previewMenu')}
		</div>
	</div>

	<GuardedForm action="?/colors" class="space-y-4 card p-4">
		<h2 class="font-semibold">{t('look.colors')}</h2>
		<div class="grid gap-4 sm:grid-cols-3">
			{#each colorFields as c (c.key)}
				<div>
					<label class="label" for="c-{c.key}">{c.label}</label>
					<div class="flex items-center gap-2">
						<input
							id="c-{c.key}"
							type="color"
							name={c.key}
							class="h-11 w-14 cursor-pointer rounded border border-line bg-surface"
							bind:value={colors[c.key]}
						/>
						<code class="text-sm">{colors[c.key]}</code>
					</div>
					<p class="mt-1 text-xs text-muted">{c.hint}</p>
				</div>
			{/each}
		</div>
		<div class="flex flex-wrap gap-2">
			<button class="btn-primary">{t('look.saveColors')}</button>
			<button class="btn-ghost" formaction="?/resetColors">{t('look.resetColors')}</button>
		</div>
	</GuardedForm>

	<section class="space-y-3 card p-4">
		<h2 class="font-semibold">{t('look.images')}</h2>
		<p class="text-sm text-muted">{t('look.imagesHint')}</p>
		<ul class="divide-y divide-line">
			{#each imageFields as f (f.key)}
				<li class="flex flex-wrap items-center gap-4 py-4">
					<div class="grid size-20 shrink-0 place-items-center rounded-lg bg-night p-2">
						<img src={look.images[f.key]} alt="" class="size-full object-contain" />
					</div>
					<div class="min-w-48 flex-1">
						<p class="font-medium">
							{f.label}
							{#if !look.custom[f.key]}<span class="text-xs font-normal text-muted"
									>{t('look.default')}</span
								>{/if}
						</p>
						<p class="text-xs text-muted">{f.hint}</p>
					</div>
					<form
						method="POST"
						action="?/upload"
						enctype="multipart/form-data"
						class="flex flex-wrap items-center gap-2"
						use:enhance
					>
						<input type="hidden" name="image" value={f.key} />
						<input
							type="file"
							name="file"
							accept="image/png,image/jpeg,image/webp"
							class="max-w-56 text-sm"
							required
							aria-label={t('look.newImage', { name: f.label })}
						/>
						<button class="btn-secondary">{t('look.upload')}</button>
						{#if look.custom[f.key]}
							<button class="btn-ghost" formaction="?/resetImage" formnovalidate
								>{t('look.useDefault')}</button
							>
						{/if}
					</form>
				</li>
			{/each}
		</ul>
	</section>
</div>
