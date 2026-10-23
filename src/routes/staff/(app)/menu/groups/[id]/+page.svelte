<script lang="ts">
	import { useTexts } from '#lib/texts/context.ts';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { formatBRL } from '#lib/domain/money.ts';

	let { data, form } = $props();
	const g = $derived(data.group);
	// Rows are edited locally until saved; new rows have no SKU yet.
	// svelte-ignore state_referenced_locally
	let rows = $state(
		data.options.map((o) => ({
			...o,
			price: o.priceCents ? formatBRL(o.priceCents).replace(/[R$\s]/g, '') : ''
		}))
	);
	let confirmDelete = $state(false);
	const add = () =>
		rows.push({ sku: '', name: '', priceCents: 0, price: '', maxQuantity: 1, active: true });
	const t = useTexts();
</script>

<svelte:head
	><title>{t('group.tabTitle', { name: data.isNew ? t('group.new') : g.name })}</title></svelte:head
>

<main class="mx-auto max-w-3xl space-y-4 p-4">
	<a class="btn-ghost min-h-9" href="/staff/menu/edit">{t('menuEdit.back')}</a>
	<h1 class="page-title">{data.isNew ? t('group.newTitle') : g.name}</h1>
	<FormError message={form?.error} />
	{#if page.url.searchParams.has('salvo') && !form}<p class="alert-ok">{t('group.saved')}</p>{/if}

	<form method="POST" action="?/save" use:enhance class="space-y-4 card p-4">
		<div>
			<label class="label" for="name">{t('group.name')}</label>
			<input
				class="field"
				id="name"
				name="name"
				value={g.name}
				required
				maxlength="80"
				placeholder={t('group.namePlaceholder')}
			/>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label class="label" for="min">{t('group.min')}</label>
				<input
					class="field"
					id="min"
					name="minSelections"
					type="number"
					min="0"
					max="20"
					value={g.minSelections}
				/>
				<p class="mt-1 text-xs text-muted">{t('group.minHint')}</p>
			</div>
			<div>
				<label class="label" for="max">{t('group.max')}</label>
				<input
					class="field"
					id="max"
					name="maxSelections"
					type="number"
					min="1"
					max="20"
					value={g.maxSelections}
				/>
			</div>
		</div>

		<fieldset class="space-y-2">
			<legend class="label">{t('group.options')}</legend>
			{#each rows as row, i (i)}
				<div
					class="grid grid-cols-[1fr_7rem_5rem] items-end gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1fr_7rem_5rem_auto]"
				>
					<input type="hidden" name="optionSku" value={row.sku} />
					<label class="text-xs text-muted"
						>{t('group.optionName')}<input
							class="field"
							name="optionName"
							bind:value={row.name}
							maxlength="80"
							placeholder={t('group.optionNamePlaceholder')}
						/></label
					>
					<label class="text-xs text-muted"
						>{t('group.optionPrice')}<input
							class="field"
							name="optionPrice"
							bind:value={row.price}
							inputmode="decimal"
							placeholder="0,00"
						/></label
					>
					<label class="text-xs text-muted"
						>{t('group.optionMax')}<input
							class="field"
							name="optionMax"
							type="number"
							min="1"
							max="20"
							bind:value={row.maxQuantity}
						/></label
					>
					<div class="col-span-3 flex items-center gap-3 sm:col-span-1">
						<label class="flex min-h-11 items-center gap-2 text-sm"
							><input
								type="checkbox"
								class="size-5"
								name="optionActive"
								value={String(i)}
								bind:checked={row.active}
							/>
							{t('group.optionActive')}</label
						>
						<button
							type="button"
							class="btn-ghost min-h-9 text-sm text-bad"
							onclick={() => rows.splice(i, 1)}
							aria-label={t('group.removeOption', { name: row.name || t('group.option') })}
							>{t('group.remove')}</button
						>
					</div>
					{#if row.sku}<p class="col-span-full text-xs text-muted">
							{t('group.code', { sku: row.sku })}
						</p>{/if}
				</div>
			{/each}
			<button type="button" class="btn-secondary min-h-9 text-sm" onclick={add}
				>{t('group.addOption')}</button
			>
		</fieldset>
		<button class="btn-primary w-full">{t('menuEdit.save')}</button>
	</form>

	{#if !data.isNew}
		<section class="space-y-2 card p-4 text-sm">
			<p>
				{t('group.usedBy')}
				{#each data.usedBy as p, i (p.sku)}<a class="underline" href="/staff/menu/products/{p.sku}"
						>{p.name}</a
					>{i < data.usedBy.length - 1 ? ', ' : ''}{:else}{t('group.noProduct')}{/each}
			</p>
			{#if confirmDelete}
				<form method="POST" action="?/delete" use:enhance class="flex gap-2">
					<button class="btn-danger">{t('group.delete')}</button>
					<button type="button" class="btn-ghost" onclick={() => (confirmDelete = false)}
						>{t('menuEdit.cancel')}</button
					>
				</form>
			{:else}
				<button class="btn-ghost text-bad" onclick={() => (confirmDelete = true)}
					>{t('group.deleteAsk')}</button
				>
			{/if}
		</section>
	{/if}
</main>
