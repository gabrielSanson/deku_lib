<script lang="ts">
	import { enhance } from '$app/forms';
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import type { TextKey } from '#lib/texts/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';
	import { costLabel, qty } from './units';

	let { data, form } = $props();
	const t = useTexts();
	let editing = $state<string | null>(null);
	const item = $derived(data.items.find((i) => i.id === editing) ?? null);
	const units = ['g', 'ml', 'un'] as const;
	const unitLabel = (u: string) => t(`stock.unit.${u}` as TextKey);
</script>

<p class="text-sm text-muted">{t('stock.intro')}</p>
<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
{#if form && 'saved' in form}<p class="alert-ok" role="status">{t('stock.saved')}</p>{/if}

{#if data.items.length === 0}
	<p class="text-muted">{t('stock.none')}</p>
{:else}
	<div class="overflow-x-auto card">
		<table class="w-full text-sm">
			<thead class="text-left text-muted">
				<tr>
					<th class="p-2">{t('stock.name')}</th>
					<th class="p-2 text-right">{t('stock.onHand')}</th>
					<th class="p-2 text-right">{t('stock.min')}</th>
					<th class="p-2">{t('stock.cost')}</th>
					<th class="p-2 text-right">{t('stock.value')}</th>
					<th class="p-2"></th>
				</tr>
			</thead>
			<tbody>
				{#each data.items as i (i.id)}
					{@const c = costLabel(i.avgCostMicro, i.baseUnit)}
					<tr class="border-t border-line {i.active ? '' : 'text-muted'}">
						<td class="p-2 font-medium">{i.name}</td>
						<td
							class="p-2 text-right tabular-nums {i.onHand <= i.min && (i.min > 0 || i.blocksSale)
								? 'font-bold text-bad'
								: ''}">{qty(i.onHand)} {unitLabel(i.baseUnit)}</td
						>
						<td class="p-2 text-right tabular-nums">{qty(i.min)}</td>
						<td class="p-2"
							>{t('stock.costPer', { value: c.value, qty: c.qty, unit: unitLabel(i.baseUnit) })}</td
						>
						<td class="p-2 text-right tabular-nums"
							>{formatBRL(Math.round((Math.max(i.onHand, 0) * i.avgCostMicro) / 1_000_000))}</td
						>
						<td class="p-2 text-right">
							<button type="button" class="btn-quiet min-h-9 px-3" onclick={() => (editing = i.id)}
								>{t('stock.edit')}</button
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

{#key editing}
	<form
		method="POST"
		action="?/save"
		use:enhance={() =>
			async ({ update }) => {
				await update();
				editing = null;
			}}
		class="grid gap-3 card p-4 sm:grid-cols-2"
	>
		<h2 class="font-semibold sm:col-span-2">{item ? item.name : t('stock.add')}</h2>
		{#if item}<input type="hidden" name="id" value={item.id} />{/if}
		<TextField
			label={t('stock.name')}
			name="name"
			value={item?.name ?? ''}
			maxlength={80}
			required
		/>
		<SelectField
			label={t('stock.unit')}
			name="baseUnit"
			value={item?.baseUnit ?? 'g'}
			options={units.map((u) => ({ value: u, label: unitLabel(u) }))}
		/>
		<TextField
			label={t('stock.min')}
			name="min"
			type="number"
			min={0}
			step={1}
			value={item?.min ?? 0}
		/>
		<SelectField
			label={t('stock.ingredient')}
			name="ingredientId"
			value={item?.ingredientId ?? ''}
			options={[
				{ value: '', label: t('stock.noIngredient') },
				...data.ingredients.map((i) => ({ value: i.id, label: i.name }))
			]}
		/>
		<Checkbox label={t('stock.blocksSale')} name="blocksSale" checked={item?.blocksSale ?? false} />
		{#if item}<Checkbox label={t('stock.active')} name="active" checked={item.active} />{/if}
		<div class="flex gap-2 sm:col-span-2">
			<button class="btn-primary">{t('stock.save')}</button>
			{#if item}<button type="button" class="btn-ghost" onclick={() => (editing = null)}
					>{t('stock.add')}</button
				>{/if}
		</div>
	</form>
{/key}
