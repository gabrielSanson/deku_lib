<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const plain = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
</script>

<svelte:head><title>{t('prices.tabTitle')}</title></svelte:head>

<main class="mx-auto max-w-4xl space-y-4 p-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="page-title">{t('prices.title')}</h1>
		<a class="btn-ghost" href="/staff/menu/edit">{t('menuEdit.title')}</a>
	</div>
	<p class="text-sm text-muted">{t('prices.intro')}</p>
	<FormError message={form?.error} />
	{#if form?.ok}<p class="alert-ok">{form.ok}</p>{/if}

	<form method="POST" action="?/markup" class="flex flex-wrap items-end gap-3 card p-4" use:enhance>
		<TextField
			label={t('prices.markup')}
			name="markup"
			inputmode="decimal"
			value={String(data.settings.markupBps / 100).replace('.', ',')}
		/>
		<TextField
			label={t('prices.round')}
			name="roundTo"
			inputmode="numeric"
			value={data.settings.roundTo === null ? '' : String(data.settings.roundTo)}
		/>
		<button class="btn-secondary">{t('prices.saveMarkup')}</button>
	</form>

	<form
		method="POST"
		action="?/prices"
		class="card"
		use:enhance={() =>
			async ({ update }) =>
				update({ reset: false })}
	>
		<table class="w-full text-sm">
			<thead class="text-left text-muted">
				<tr>
					<th class="p-2">{t('prices.colProduct')}</th>
					<th class="p-2 text-right">{t('prices.colSite')}</th>
					<th class="p-2">{t('prices.colIfood')}</th>
				</tr>
			</thead>
			<tbody>
				{#each data.products as p (p.sku)}
					<tr class="border-t border-line">
						<td class="p-2">
							{p.name}
							<div class="text-xs text-muted">{p.category}</div>
						</td>
						<td class="p-2 text-right">{formatBRL(p.priceCents)}</td>
						<td class="p-2">
							<input
								class="field w-28"
								name="ifood:{p.sku}"
								inputmode="decimal"
								aria-label="{t('prices.colIfood')}: {p.name}"
								placeholder={plain(p.suggestedCents)}
								value={p.ifoodCents === null ? '' : plain(p.ifoodCents)}
							/>
							<div class="text-xs text-muted">
								{t('prices.suggested', { price: formatBRL(p.suggestedCents) })}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<div class="p-3"><button class="btn-primary">{t('prices.save')}</button></div>
	</form>
</main>
