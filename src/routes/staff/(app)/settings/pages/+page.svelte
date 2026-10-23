<script lang="ts">
	import TextArea from '#lib/components/molecules/TextArea.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import { useTexts } from '#lib/texts/context.ts';
	import GuardedForm from '#lib/components/organisms/GuardedForm.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import ConfirmedPost from '#lib/components/organisms/ConfirmedPost.svelte';

	let { data, form } = $props();
	const t = useTexts();
	let removing = $state<{ slug: string; title: string } | null>(null);
	let removeOpen = $state(false);
</script>

<svelte:head><title>{t('sitePages.tabTitle')}</title></svelte:head>

<div class="space-y-4">
	<h1 class="page-title">{t('sitePages.title')}</h1>
	<p class="text-sm text-muted">
		{t('sitePages.intro')}
	</p>
	<FormError message={form?.error} />

	<GuardedForm action="?/create" reset class="flex flex-wrap items-end gap-2 card p-4">
		<TextField
			label={t('sitePages.new')}
			id="new-page"
			wrapClass="flex-1 min-w-48"
			name="title"
			required
			maxlength={120}
			placeholder={t('sitePages.newPlaceholder')}
		/>
		<button class="btn-secondary">{t('sitePages.create')}</button>
	</GuardedForm>
	{#if form?.created}<p class="alert-ok">{t('sitePages.created')}</p>{/if}

	{#each data.pages as p (p.slug)}
		<GuardedForm action="?/save" class="space-y-2 card p-4">
			<input type="hidden" name="slug" value={p.slug} />
			<div class="flex items-center justify-between gap-2">
				<TextField
					label={t('sitePages.pageTitle', { title: p.title })}
					hideLabel
					id="title-{p.slug}"
					wrapClass="flex-1"
					class="font-semibold"
					name="title"
					value={p.title}
					required
					maxlength={120}
				/>
				<a class="btn-ghost min-h-9 text-sm whitespace-nowrap" href="/p/{p.slug}" target="_blank"
					>{t('sitePages.view')}</a
				>
			</div>
			<TextArea
				label={t('sitePages.text', { title: p.title })}
				hideLabel
				id="text-{p.slug}"
				class="min-h-36"
				name="text"
				value={p.text}
			/>
			<div class="flex items-center justify-between">
				<Checkbox
					label={t('sitePages.published')}
					name="published"
					checked={p.published}
					class="text-sm"
				/>
				<div class="flex gap-2">
					{#if !p.builtIn}
						<button
							type="button"
							class="btn-ghost text-bad"
							onclick={() => {
								removing = { slug: p.slug, title: p.title };
								removeOpen = true;
							}}>{t('sitePages.delete')}</button
						>
					{/if}
					<button class="btn-primary">{t('menuEdit.save')}</button>
				</div>
			</div>
			{#if form?.ok === p.slug}<p class="alert-ok">{t('sitePages.saved')}</p>{/if}
		</GuardedForm>
	{/each}

	<ConfirmedPost
		bind:open={removeOpen}
		action="?/delete"
		fields={{ slug: removing?.slug ?? '' }}
		title={t('sitePages.deleteConfirm', { title: removing?.title ?? '' })}
		text={t('sitePages.deleteText')}
		confirmLabel={t('sitePages.delete')}
	/>
</div>
