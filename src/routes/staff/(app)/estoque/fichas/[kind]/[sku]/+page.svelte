<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	let lines = $state(
		untrack(() =>
			data.recipe.lines.map((l) => ({
				stockItemId: l.stockItemId,
				qty: String(l.qtyBase),
				ingredientId: l.ingredientId ?? ''
			}))
		)
	);
	const valid = $derived(lines.filter((l) => l.stockItemId && Number(l.qty) > 0));
	const payload = $derived(
		JSON.stringify(
			valid.map((l) => ({
				stockItemId: l.stockItemId,
				qtyBase: Math.round(Number(l.qty)),
				ingredientId: l.ingredientId || null
			}))
		)
	);
	const costCents = $derived(
		Math.round(
			valid.reduce(
				(n, l) =>
					n +
					Math.round(Number(l.qty)) *
						(data.items.find((i) => i.id === l.stockItemId)?.avgCostMicro ?? 0),
				0
			) / 1_000_000
		)
	);
	const unitOf = (id: string) => data.items.find((i) => i.id === id)?.baseUnit ?? '';
</script>

<a class="text-sm underline" href="/staff/estoque/fichas">← {t('stock.tab.recipes')}</a>
<h2 class="text-lg font-bold">{data.recipe.name}</h2>
<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
{#if form && 'saved' in form}<p class="alert-ok" role="status">{t('stock.saved')}</p>{/if}

<form method="POST" use:enhance class="space-y-3 card p-4">
	<input type="hidden" name="payload" value={payload} />
	{#each lines as line, i (i)}
		<div class="grid grid-cols-2 items-end gap-2 sm:grid-cols-[2fr_1fr_2fr_auto]">
			<div class="col-span-2 sm:col-span-1">
				<SelectField
					label={t('stock.recipes.line')}
					bind:value={line.stockItemId}
					options={[
						{ value: '', label: '—' },
						...data.items.map((it) => ({ value: it.id, label: it.name }))
					]}
				/>
			</div>
			<TextField
				label="{t('stock.recipes.qty')} {unitOf(line.stockItemId)}"
				type="number"
				min={1}
				step={1}
				bind:value={line.qty}
			/>
			{#if data.recipe.kind === 'product' && data.recipe.ingredients.length}
				<SelectField
					label={t('stock.recipes.skipIf')}
					bind:value={line.ingredientId}
					options={[
						{ value: '', label: t('stock.noIngredient') },
						...data.recipe.ingredients.map((g) => ({ value: g.id, label: g.name }))
					]}
				/>
			{:else}
				<span></span>
			{/if}
			<button type="button" class="btn-quiet min-h-10 px-3" onclick={() => lines.splice(i, 1)}
				>{t('stock.recipes.remove')}</button
			>
		</div>
	{/each}
	<p class="font-semibold">{t('stock.recipes.costLine', { value: formatBRL(costCents) })}</p>
	<div class="flex flex-wrap gap-2">
		<button
			type="button"
			class="btn-ghost"
			onclick={() => lines.push({ stockItemId: '', qty: '', ingredientId: '' })}
			>{t('stock.recipes.addLine')}</button
		>
		<button class="btn-primary">{t('stock.save')}</button>
	</div>
</form>
