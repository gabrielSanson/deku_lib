<script lang="ts">
	import { enhance } from '$app/forms';
	import FileField from '#lib/components/molecules/FileField.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	let busy = $state(false);
	const submit = () => {
		busy = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			busy = false;
		};
	};
</script>

<svelte:head><title>{t('menuImport.tabTitle')}</title></svelte:head>

<main class="mx-auto max-w-4xl space-y-4 p-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="page-title">{t('menuImport.title')}</h1>
		<a class="btn-ghost" href={data.fromSetup ? '/staff/setup' : '/staff/menu/edit'}
			>{t('menuEdit.title')}</a
		>
	</div>
	<p class="text-sm text-muted">{t('menuImport.intro')}</p>
	<a class="btn-secondary" href="/staff/menu/importar/modelo.csv" download
		>{t('menuImport.template')}</a
	>

	{#if form && 'imported' in form}
		<p class="alert-ok">{form.imported}</p>
	{/if}
	{#if form && 'problem' in form && form.problem}
		<p class="alert-error">{t(`menuImport.problem.${form.problem}`)}</p>
	{/if}
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />

	<form
		method="POST"
		action="?/preview"
		enctype="multipart/form-data"
		class="flex flex-wrap items-end gap-2 card p-4"
		use:enhance={submit}
	>
		<FileField
			label={t('menuImport.file')}
			name="file"
			accept=".csv,text/csv"
			required
			wrapClass="flex-1"
		/>
		<button class="btn-secondary" disabled={busy}>{t('menuImport.preview')}</button>
	</form>

	{#if form && 'rows' in form && form.rows}
		<div class="overflow-x-auto card">
			<table class="w-full text-sm">
				<thead class="text-left text-muted">
					<tr>
						<th class="p-2">{t('menuImport.line')}</th>
						<th class="p-2">categoria</th>
						<th class="p-2">nome</th>
						<th class="p-2 text-right">preco</th>
						<th class="p-2">adicionais</th>
						<th class="p-2"></th>
					</tr>
				</thead>
				<tbody>
					{#each form.rows as r (r.line)}
						<tr class="border-t border-line {r.problems.length ? 'bg-bad-tint' : ''}">
							<td class="p-2">{r.line}</td>
							<td class="p-2">{r.category}</td>
							<td class="p-2">{r.name}</td>
							<td class="p-2 text-right">{r.priceCents === null ? '' : formatBRL(r.priceCents)}</td>
							<td class="p-2">
								{r.extras
									.map((e) => (e.priceCents ? `${e.name} +${formatBRL(e.priceCents)}` : e.name))
									.join(', ')}
							</td>
							<td class="p-2">
								{#if r.problems.length}
									<span class="text-bad"
										>{r.problems.map((p) => t(`menuImport.problem.${p}`)).join(' ')}</span
									>
								{:else}
									{t('menuImport.ok')}
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if form.ready}
			<form method="POST" action="?/import" use:enhance={submit}>
				<input type="hidden" name="csv" value={form.csv} />
				<button class="btn-primary" disabled={busy}
					>{t('menuImport.confirm', { count: form.count })}</button
				>
			</form>
		{/if}
	{/if}
</main>
