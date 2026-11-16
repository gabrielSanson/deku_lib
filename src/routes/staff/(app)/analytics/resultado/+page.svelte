<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import type { TextKey } from '#lib/texts/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const r = $derived(data.result);
</script>

<svelte:head><title>{t('dre.title')}</title></svelte:head>

<main class="space-y-4 p-4 sm:p-6">
	<a class="text-sm underline" href="/staff/analytics">← {t('nav.relatorios')}</a>
	<h1 class="page-title">{t('dre.title')}</h1>
	<p class="text-sm text-muted">{t('dre.intro')}</p>
	<form method="GET" class="flex flex-wrap items-end gap-2">
		<TextField label={t('expenses.month')} name="mes" type="month" value={r.month} />
		<button class="btn-secondary">OK</button>
		<a class="btn-ghost" href="/staff/analytics/resultado/csv?mes={r.month}" download
			>{t('dre.csv')}</a
		>
		<a class="btn-ghost" href="/staff/despesas?mes={r.month}">{t('expenses.title')}</a>
	</form>

	{#if r.simplesRateBps === 0}<p class="alert-warn">{t('dre.simplesMissing')}</p>{/if}

	<div class="card p-4">
		<table class="w-full text-sm tabular-nums">
			<tbody>
				{#each r.lines as l (l.key)}
					<tr class="border-t border-line first:border-0 {l.total ? 'font-bold' : ''}">
						<td class="py-1.5">{t(`dre.line.${l.key}` as TextKey)}</td>
						<td class="py-1.5 text-right {l.key === 'result' && l.cents < 0 ? 'text-bad' : ''}"
							>{formatBRL(l.cents)}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="text-sm text-muted">
		{r.foodCostKind === 'real' ? t('dre.foodReal') : t('dre.foodTheoretical')}
		{#if r.withoutRecipe}{t('profit.withoutRecipe', { n: r.withoutRecipe })}{/if}
	</p>

	<form
		method="POST"
		action="?/simples"
		use:enhance
		class="flex flex-wrap items-end gap-2 card p-4"
	>
		<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
		<TextField
			label={t('dre.simples')}
			name="rate"
			inputmode="decimal"
			value={(r.simplesRateBps / 100).toLocaleString('pt-BR')}
		/>
		<button class="btn-primary">{t('settings.save')}</button>
		{#if form && 'saved' in form}<span class="text-sm">{t('settings.saved')}</span>{/if}
	</form>
</main>
