<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatBRL, parseBRL } from '#lib/domain/money.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	let supplier = $state('');
	let purchasedOn = $state(new Date().toISOString().slice(0, 10));
	let lines = $state([{ stockItemId: '', qty: '', total: '' }]);
	const payload = $derived(
		JSON.stringify({
			supplier: supplier || undefined,
			purchasedOn,
			lines: lines
				.filter((l) => l.stockItemId && Number(l.qty) > 0)
				.map((l) => ({
					stockItemId: l.stockItemId,
					qtyBase: Math.round(Number(l.qty)),
					totalCents: parseBRL(l.total) ?? 0
				}))
		})
	);
	const unitOf = (id: string) => data.items.find((i) => i.id === id)?.baseUnit ?? '';
</script>

<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
{#if form && 'saved' in form}<p class="alert-ok" role="status">{t('stock.saved')}</p>{/if}

<form
	method="POST"
	use:enhance={() =>
		async ({ result, update }) => {
			await update();
			if (result.type === 'success') lines = [{ stockItemId: '', qty: '', total: '' }];
		}}
	class="space-y-3 card p-4"
>
	<h2 class="font-semibold">{t('stock.purchase.new')}</h2>
	<input type="hidden" name="payload" value={payload} />
	<div class="grid gap-3 sm:grid-cols-2">
		<TextField label={t('stock.purchase.supplier')} bind:value={supplier} maxlength={80} />
		<TextField label={t('stock.purchase.date')} type="date" bind:value={purchasedOn} />
	</div>
	{#each lines as line, i (i)}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr]">
			<div class="col-span-2 sm:col-span-1">
				<SelectField
					label={t('stock.purchase.item')}
					bind:value={line.stockItemId}
					options={[
						{ value: '', label: '—' },
						...data.items.map((it) => ({ value: it.id, label: `${it.name} (${it.baseUnit})` }))
					]}
				/>
			</div>
			<TextField
				label="{t('stock.purchase.qty')} {unitOf(line.stockItemId)}"
				type="number"
				min={1}
				step={1}
				bind:value={line.qty}
			/>
			<TextField label={t('stock.purchase.total')} inputmode="decimal" bind:value={line.total} />
		</div>
	{/each}
	<div class="flex flex-wrap gap-2">
		<button
			type="button"
			class="btn-ghost"
			onclick={() => lines.push({ stockItemId: '', qty: '', total: '' })}
			>{t('stock.purchase.addLine')}</button
		>
		<button class="btn-primary">{t('stock.save')}</button>
	</div>
</form>

{#if data.purchases.length === 0}
	<p class="text-muted">{t('stock.purchase.none')}</p>
{:else}
	<ul class="divide-y divide-line card">
		{#each data.purchases as p (p.id)}
			<li class="flex justify-between gap-2 p-3 text-sm">
				<span
					>{new Date(p.purchasedOn).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} · {p.supplier ??
						'—'} · {t('stock.purchase.lines', { n: p.lines })}</span
				>
				<span class="font-semibold tabular-nums">{formatBRL(p.totalCents)}</span>
			</li>
		{/each}
	</ul>
{/if}
