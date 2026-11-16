<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import { formatDateTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';
	import { qty } from '../units';

	let { data, form } = $props();
	const t = useTexts();
</script>

<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
{#if form && 'saved' in form}<p class="alert-ok" role="status">{t('stock.saved')}</p>{/if}

<form
	method="POST"
	use:enhance
	class="grid gap-3 card p-4 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end"
>
	<SelectField
		label={t('stock.purchase.item')}
		name="stockItemId"
		required
		options={[
			{ value: '', label: '—' },
			...data.items.map((i) => ({ value: i.id, label: `${i.name} (${i.baseUnit})` }))
		]}
	/>
	<TextField label={t('stock.purchase.qty')} name="qty" type="number" min={1} step={1} required />
	<TextField label={t('stock.waste.reason')} name="reason" maxlength={200} />
	<button class="btn-primary">{t('stock.waste.save')}</button>
</form>

{#if data.waste.length === 0}
	<p class="text-muted">{t('stock.waste.none')}</p>
{:else}
	<ul class="divide-y divide-line card">
		{#each data.waste as w (w.id)}
			<li class="flex justify-between gap-2 p-3 text-sm">
				<span
					>{formatDateTime(w.createdAt)} · {w.item}: {qty(-w.qty)}
					{w.baseUnit}{w.reason ? ` · ${w.reason}` : ''}</span
				>
				<span class="tabular-nums"
					>{formatBRL(Math.round((-w.qty * w.unitCostMicro) / 1_000_000))}</span
				>
			</li>
		{/each}
	</ul>
{/if}
