<script lang="ts">
	import { useTexts } from '#lib/texts/context.ts';
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';

	let { data, form } = $props();
	const t = useTexts();
</script>

<svelte:head><title>{t('sitePages.tabTitle')}</title></svelte:head>

<main class="mx-auto max-w-3xl space-y-4 p-4">
	<a class="btn-ghost min-h-9" href="/staff/menu/edit">{t('menuEdit.back')}</a>
	<h1 class="page-title">{t('sitePages.title')}</h1>
	<p class="text-sm text-muted">
		{t('sitePages.intro')}
	</p>
	<FormError message={form?.error} />

	{#each data.pages as p (p.slug)}
		<form
			method="POST"
			action="?/save"
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
			class="space-y-2 card p-4"
		>
			<input type="hidden" name="slug" value={p.slug} />
			<div class="flex items-center justify-between gap-2">
				<input class="field font-semibold" name="title" value={p.title} required maxlength="120" />
				<a class="btn-ghost min-h-9 text-sm whitespace-nowrap" href="/p/{p.slug}" target="_blank"
					>{t('sitePages.view')}</a
				>
			</div>
			<textarea
				class="field min-h-36"
				name="text"
				aria-label={t('sitePages.text', { title: p.title })}>{p.text}</textarea
			>
			<div class="flex items-center justify-between">
				<label class="flex min-h-11 items-center gap-2 text-sm"
					><input type="checkbox" class="size-5" name="published" checked={p.published} />
					{t('sitePages.published')}</label
				>
				<button class="btn-primary">{t('menuEdit.save')}</button>
			</div>
			{#if form?.ok === p.slug}<p class="alert-ok">{t('sitePages.saved')}</p>{/if}
		</form>
	{/each}
</main>
