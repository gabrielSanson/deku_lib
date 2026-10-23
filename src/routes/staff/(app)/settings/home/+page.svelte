<script lang="ts">
	import { enhance } from '$app/forms';
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import TextArea from '#lib/components/molecules/TextArea.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import GuardedForm from '#lib/components/organisms/GuardedForm.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	// Configurações → Página inicial: the hero photo, its texts and buttons, and which
	// blocks show under it. One form for the layout and texts; the photos upload on their own.
	let { data, form } = $props();
	const t = useTexts();
	const look = $derived(data.look);
	const home = $derived(data.look.home);

	const imageFields = [
		{ key: 'heroImage', label: t('homeEdit.heroImage'), hint: t('homeEdit.heroImageHint') },
		{ key: 'heroLogo', label: t('look.heroLogo'), hint: t('look.heroLogoHint') }
	] as const;
	const long = (x: { default: string }) => x.default.length > 60 || x.default.includes('\n');
</script>

<svelte:head><title>{t('homeEdit.tabTitle')}</title></svelte:head>

{#snippet textFields(list: typeof data.heroTexts)}
	{#each list as x (x.key)}
		{#if long(x)}
			<TextArea
				label={x.label}
				name="t:{x.key}"
				id={x.key}
				rows={3}
				maxlength={1000}
				value={x.value}
				placeholder={x.default}
			/>
		{:else}
			<TextField
				label={x.label}
				name="t:{x.key}"
				id={x.key}
				maxlength={1000}
				value={x.value}
				placeholder={x.default}
			/>
		{/if}
	{/each}
{/snippet}

<div class="space-y-4">
	<header class="flex flex-wrap items-start justify-between gap-3">
		<div class="space-y-1">
			<h1 class="page-title">{t('homeEdit.title')}</h1>
			<p class="text-sm text-muted">{t('homeEdit.intro')}</p>
		</div>
		<a href="/" target="_blank" class="btn-secondary">{t('homeEdit.view')}</a>
	</header>

	<FormError message={form?.error} />
	{#if form && 'image' in form}<p class="alert-ok" role="status">{form.image}</p>{/if}

	<section class="space-y-3 card p-4">
		<h2 class="font-semibold">{t('homeEdit.images')}</h2>
		<p class="text-sm text-muted">{t('look.imagesHint')}</p>
		<ul class="divide-y divide-line">
			{#each imageFields as f (f.key)}
				<li class="flex flex-wrap items-center gap-4 py-4">
					<div class="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-night">
						<img
							src={look.images[f.key]}
							alt=""
							class="size-full {f.key === 'heroImage' ? 'object-cover' : 'object-contain p-2'}"
						/>
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

	<GuardedForm action="?/save" class="space-y-4">
		<section class="space-y-4 card p-4">
			<h2 class="font-semibold">{t('homeEdit.hero')}</h2>
			<div class="grid gap-4 sm:grid-cols-2">
				<SelectField
					label={t('homeEdit.align')}
					name="heroAlign"
					value={home.heroAlign}
					options={[
						{ value: 'left', label: t('homeEdit.align.left') },
						{ value: 'center', label: t('homeEdit.align.center') }
					]}
				/>
				<SelectField
					label={t('homeEdit.size')}
					name="heroSize"
					value={home.heroSize}
					options={[
						{ value: 'tall', label: t('homeEdit.size.tall') },
						{ value: 'compact', label: t('homeEdit.size.compact') }
					]}
				/>
			</div>
			<div>
				<Checkbox
					name="heroCutout"
					checked={home.heroCutout}
					label={t('homeEdit.cutout')}
					hint={t('homeEdit.cutoutHint')}
				/>
				<Checkbox name="showStatus" checked={home.showStatus} label={t('homeEdit.status')} />
				<Checkbox name="showModes" checked={home.showModes} label={t('homeEdit.modes')} />
			</div>

			<h3 class="pt-2 font-semibold">{t('homeEdit.texts')}</h3>
			<p class="-mt-2 text-sm text-muted">{t('homeEdit.textsHint')}</p>
			{@render textFields(data.heroTexts)}

			<h3 class="pt-2 font-semibold">{t('homeEdit.buttons')}</h3>
			<datalist id="home-links">
				{#each data.links as l (l)}<option value={l}></option>{/each}
			</datalist>
			<div class="grid gap-4 sm:grid-cols-2">
				<TextField
					label={t('homeEdit.primaryHref')}
					name="primaryHref"
					value={home.primaryHref}
					list="home-links"
					maxlength={300}
					required
					hint={t('homeEdit.linkHint')}
				/>
				<TextField
					label={t('homeEdit.secondaryHref')}
					name="secondaryHref"
					value={home.secondaryHref ?? ''}
					list="home-links"
					maxlength={300}
					hint={t('homeEdit.secondaryHint')}
				/>
			</div>
		</section>

		<section class="space-y-4 card p-4">
			<h2 class="font-semibold">{t('homeEdit.blocks')}</h2>
			<Checkbox name="showFeatured" checked={home.showFeatured} label={t('homeEdit.featured')} />
			<div class="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
				<SelectField
					label={t('homeEdit.featuredCategory')}
					name="featuredCategoryId"
					value={home.featuredCategoryId ?? ''}
					options={[
						{ value: '', label: t('homeEdit.featuredAuto') },
						...data.categories.map((c) => ({ value: c.id, label: c.name }))
					]}
				/>
				<SelectField
					label={t('homeEdit.featuredCount')}
					name="featuredCount"
					value={String(home.featuredCount)}
					options={[
						{ value: '3', label: '3' },
						{ value: '6', label: '6' }
					]}
				/>
			</div>
			<Checkbox
				name="showMenuButton"
				checked={home.showMenuButton}
				label={t('homeEdit.menuButton')}
			/>
			{@render textFields(data.blockTexts)}
		</section>

		{#if form && 'ok' in form}<p class="alert-ok" role="status">{t('homeEdit.saved')}</p>{/if}
		<button class="btn-primary">{t('homeEdit.save')}</button>
	</GuardedForm>
</div>
