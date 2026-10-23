<script lang="ts">
	import TextArea from '#lib/components/molecules/TextArea.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import SearchField from '#lib/components/molecules/SearchField.svelte';
	import GuardedForm from '#lib/components/organisms/GuardedForm.svelte';
	import { useTexts } from '#lib/texts/context.ts';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { placeholders } from '#lib/texts/catalog.ts';

	let { data, form } = $props();
	let search = $state('');
	const q = $derived(search.trim().toLowerCase());
	const matches = (x: { label: string; value: string; default: string }) =>
		!q || [x.label, x.value, x.default].some((s) => s.toLowerCase().includes(q));
	const changedCount = $derived(
		data.groups.flatMap((g) => g.texts).filter((x) => x.changed).length
	);
	const t = useTexts();
</script>

<svelte:head><title>{t('texts.tabTitle')}</title></svelte:head>

{#snippet changedMark()}
	<span class="rounded bg-brand-100 px-1.5 text-xs text-brand-700">{t('texts.changedMark')}</span>
{/snippet}

<div class="space-y-4">
	<header class="space-y-1">
		<h1 class="page-title">{t('texts.title')}</h1>
		<p class="text-sm text-muted">
			{t('texts.intro')}
			{#if changedCount}<strong>{t('texts.changed', { n: changedCount })}</strong>{/if}
		</p>
	</header>

	<SearchField label={t('texts.search')} bind:value={search} />

	<GuardedForm action="?/save" class="space-y-3">
		{#each data.groups as g (g.group)}
			{@const shown = g.texts.filter(matches)}
			<!-- Hidden, not removed: every field stays in the form while searching. -->
			<details class="card {shown.length ? '' : 'hidden'}" open={q ? true : undefined}>
				<summary
					class="flex min-h-12 cursor-pointer items-center justify-between px-4 font-semibold"
				>
					{g.title}
					<span class="text-sm font-normal text-muted">{t('texts.count', { n: shown.length })}</span
					>
				</summary>
				<div class="space-y-4 border-t border-line p-4">
					{#each g.texts as x (x.key)}
						{@const vars = placeholders(x.default)}
						{@const hint = vars.length
							? t('texts.needs', { vars: vars.map((v) => `{${v}}`).join(', ') })
							: null}
						<div class={matches(x) ? '' : 'hidden'}>
							{#if x.default.length > 60 || x.default.includes('\n')}
								<TextArea
									label={x.label}
									aside={x.changed ? changedMark : undefined}
									{hint}
									id={x.key}
									name="t:{x.key}"
									maxlength={1000}
									placeholder={x.default}
									value={x.changed ? x.value : ''}
								/>
							{:else}
								<TextField
									label={x.label}
									aside={x.changed ? changedMark : undefined}
									{hint}
									id={x.key}
									name="t:{x.key}"
									maxlength={1000}
									placeholder={x.default}
									value={x.changed ? x.value : ''}
								/>
							{/if}
						</div>
					{/each}
				</div>
			</details>
		{/each}
		<FormError message={form?.error} />
		{#if form?.ok}<p class="alert-ok">{t('texts.saved')}</p>{/if}
		<div class="sticky bottom-0 bg-canvas py-3">
			<button class="btn-primary w-full sm:w-auto">{t('texts.save')}</button>
		</div>
	</GuardedForm>
</div>
