<script lang="ts">
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
</script>

<svelte:head><title>{data.isNew ? 'Novo grupo' : g.name} · Cardápio</title></svelte:head>

<main class="mx-auto max-w-3xl space-y-4 p-4">
	<a class="btn-ghost min-h-9" href="/staff/menu/edit">← Cardápio</a>
	<h1 class="page-title">{data.isNew ? 'Novo grupo de opções' : g.name}</h1>
	<FormError message={form?.error} />
	{#if page.url.searchParams.has('salvo') && !form}<p class="alert-ok">Salvo.</p>{/if}

	<form method="POST" action="?/save" use:enhance class="space-y-4 card p-4">
		<div>
			<label class="label" for="name">Nome do grupo</label>
			<input
				class="field"
				id="name"
				name="name"
				value={g.name}
				required
				maxlength="80"
				placeholder="Adicionais"
			/>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label class="label" for="min">Mínimo de escolhas</label>
				<input
					class="field"
					id="min"
					name="minSelections"
					type="number"
					min="0"
					max="20"
					value={g.minSelections}
				/>
				<p class="mt-1 text-xs text-muted">0 = opcional. 1 = obrigatório (ex.: ponto da carne).</p>
			</div>
			<div>
				<label class="label" for="max">Máximo de escolhas</label>
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
			<legend class="label">Opções</legend>
			{#each rows as row, i (i)}
				<div
					class="grid grid-cols-[1fr_7rem_5rem] items-end gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1fr_7rem_5rem_auto]"
				>
					<input type="hidden" name="optionSku" value={row.sku} />
					<label class="text-xs text-muted"
						>Nome<input
							class="field"
							name="optionName"
							bind:value={row.name}
							maxlength="80"
							placeholder="Bacon"
						/></label
					>
					<label class="text-xs text-muted"
						>Preço extra<input
							class="field"
							name="optionPrice"
							bind:value={row.price}
							inputmode="decimal"
							placeholder="0,00"
						/></label
					>
					<label class="text-xs text-muted"
						>Até<input
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
							/> Ativa</label
						>
						<button
							type="button"
							class="btn-ghost min-h-9 text-sm text-bad"
							onclick={() => rows.splice(i, 1)}
							aria-label="Remover {row.name || 'opção'}">Remover</button
						>
					</div>
					{#if row.sku}<p class="col-span-full text-xs text-muted">Código: {row.sku}</p>{/if}
				</div>
			{/each}
			<button type="button" class="btn-secondary min-h-9 text-sm" onclick={add}
				>Adicionar opção</button
			>
		</fieldset>
		<button class="btn-primary w-full">Salvar</button>
	</form>

	{#if !data.isNew}
		<section class="space-y-2 card p-4 text-sm">
			<p>
				Usado em:
				{#each data.usedBy as p, i (p.sku)}<a class="underline" href="/staff/menu/products/{p.sku}"
						>{p.name}</a
					>{i < data.usedBy.length - 1 ? ', ' : ''}{:else}nenhum produto{/each}
			</p>
			{#if confirmDelete}
				<form method="POST" action="?/delete" use:enhance class="flex gap-2">
					<button class="btn-danger">Apagar grupo</button>
					<button type="button" class="btn-ghost" onclick={() => (confirmDelete = false)}
						>Cancelar</button
					>
				</form>
			{:else}
				<button class="btn-ghost text-bad" onclick={() => (confirmDelete = true)}
					>Apagar grupo…</button
				>
			{/if}
		</section>
	{/if}
</main>
