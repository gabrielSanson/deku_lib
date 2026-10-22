<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { untrack } from 'svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import { formatBRL, parseBRL } from '#lib/domain/money.ts';
	import { guardUnsaved } from '#lib/client/unsaved.svelte.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	let formEl = $state<HTMLFormElement>();
	const guard = guardUnsaved(
		() => formEl,
		() => t('unsaved.confirm')
	);
	const p = $derived(data.product);
	const channels = [
		{ id: 'counter', label: 'Caixa' },
		{ id: 'web', label: 'Site' },
		{ id: 'ifood', label: 'iFood' }
	];
	let busy = $state(false);
	let confirmDelete = $state(false);
	let preview = $state<string | null>(null);
	// What the customer sees, updated while the form is edited.
	const live = $state({
		name: untrack(() => p.name),
		description: untrack(() => p.description),
		price: untrack(() => (p.priceCents ? formatBRL(p.priceCents).replace(/[R$\s]/g, '') : ''))
	});
	function track(e: Event) {
		const el = e.target as HTMLInputElement | HTMLTextAreaElement;
		if (el.id === 'name' || el.id === 'description' || el.id === 'price') live[el.id] = el.value;
	}

	function pick(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (preview) URL.revokeObjectURL(preview);
		preview = file ? URL.createObjectURL(file) : null;
	}
</script>

<svelte:head><title>{data.isNew ? 'Novo produto' : p.name} · Cardápio</title></svelte:head>

<main class="mx-auto max-w-2xl space-y-4 p-4">
	<a class="btn-ghost min-h-9" href="/staff/menu/edit">← Cardápio</a>
	<h1 class="page-title">{data.isNew ? 'Novo produto' : p.name}</h1>
	<FormError message={form?.error} />
	{#if page.url.searchParams.has('salvo') && !form}<p class="alert-ok">Salvo.</p>{/if}

	<section class="card p-4" aria-label="Como aparece no cardápio">
		<p class="mb-3 section-label">Como aparece no cardápio</p>
		<div class="flex gap-3">
			{#if preview || p.imageUrl}
				<img src={preview ?? p.imageUrl} alt="" class="size-24 shrink-0 rounded-lg object-cover" />
			{:else}
				<div
					class="grid size-24 shrink-0 place-items-center rounded-lg bg-night text-xs text-stone-400"
				>
					Sem foto
				</div>
			{/if}
			<div class="min-w-0">
				<p class="font-bold">{live.name || 'Nome do produto'}</p>
				<p class="line-clamp-2 text-sm text-muted">{live.description}</p>
				<Money cents={parseBRL(live.price) ?? 0} class="mt-1 block font-black" />
			</div>
		</div>
	</section>

	<form
		bind:this={formEl}
		oninput={track}
		method="POST"
		action="?/save"
		enctype="multipart/form-data"
		use:enhance={() => {
			busy = true;
			guard.saving();
			return async ({ update }) => {
				await update({ reset: false });
				busy = false;
				guard.saved();
			};
		}}
		class="space-y-4 card p-4"
	>
		<div>
			<label class="label" for="name">Nome</label>
			<input class="field" id="name" name="name" value={p.name} required maxlength="120" />
		</div>
		<div>
			<label class="label" for="description">Descrição</label>
			<textarea class="field min-h-20" id="description" name="description" maxlength="600"
				>{p.description}</textarea
			>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="label" for="price">Preço (R$)</label>
				<input
					class="field"
					id="price"
					name="price"
					inputmode="decimal"
					value={p.priceCents ? formatBRL(p.priceCents).replace(/[R$\s]/g, '') : ''}
					placeholder="29,90"
					required
				/>
			</div>
			<div>
				<label class="label" for="categoryId">Categoria</label>
				<select class="field" id="categoryId" name="categoryId" value={p.categoryId}>
					{#each data.categories as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
				</select>
			</div>
			<div>
				<label class="label" for="prepStation">Preparado em</label>
				<select class="field" id="prepStation" name="prepStation" value={p.prepStation}>
					{#each data.stations as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
				</select>
			</div>
			<div>
				<label class="label" for="position">Ordem na categoria</label>
				<input class="field" id="position" name="position" type="number" value={p.position} />
			</div>
		</div>

		<fieldset>
			<legend class="label">Foto</legend>
			<div class="flex items-center gap-3">
				{#if preview || p.imageUrl}
					<img src={preview ?? p.imageUrl} alt="" class="size-20 rounded-lg object-cover" />
				{/if}
				<input
					type="file"
					name="photo"
					accept="image/jpeg,image/png,image/webp"
					onchange={pick}
					class="text-sm"
				/>
			</div>
			{#if p.imageUrl}
				<label class="mt-2 flex items-center gap-2 text-sm"
					><input type="checkbox" name="removePhoto" value="1" /> Remover foto</label
				>
			{/if}
			<p class="mt-1 text-xs text-muted">JPG, PNG ou WebP, até 5 MB.</p>
		</fieldset>

		<fieldset>
			<legend class="label">Vender em</legend>
			<div class="flex flex-wrap gap-4">
				{#each channels as c (c.id)}
					<label class="flex min-h-11 items-center gap-2"
						><input
							type="checkbox"
							class="size-5"
							name="channels"
							value={c.id}
							checked={p.channels.includes(c.id)}
						/>
						{c.label}</label
					>
				{/each}
			</div>
		</fieldset>

		{#if data.groups.length}
			<fieldset>
				<legend class="label">Grupos de opções</legend>
				<div class="flex flex-wrap gap-4">
					{#each data.groups as g (g.id)}
						<label class="flex min-h-11 items-center gap-2"
							><input
								type="checkbox"
								class="size-5"
								name="groupIds"
								value={g.id}
								checked={p.groupIds.includes(g.id)}
							/>
							{g.name}</label
						>
					{/each}
				</div>
			</fieldset>
		{/if}

		<fieldset>
			<legend class="label">Ingredientes</legend>
			{#if data.ingredients.length}
				<p class="mb-2 text-xs text-muted">
					Marque o que vai no produto. "Cliente pode retirar" mostra a opção "sem" no site e no
					caixa. Quando um ingrediente que não pode ser retirado acaba, o produto fica indisponível.
				</p>
				<ul class="divide-y divide-line rounded-lg border border-line">
					{#each data.ingredients as ing (ing.id)}
						{@const current = p.ingredients.find((i) => i.id === ing.id)}
						<li class="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
							<label class="flex min-h-10 flex-1 items-center gap-2"
								><input
									type="checkbox"
									class="size-5"
									name="ingredientIds"
									value={ing.id}
									checked={Boolean(current)}
								/>
								<span
									>{ing.name}
									{#if ing.allergens.length}<span class="text-xs text-muted"
											>· {ing.allergens.join(', ')}</span
										>{/if}</span
								></label
							>
							<label class="flex items-center gap-2 text-sm text-muted"
								><input
									type="checkbox"
									class="size-4"
									name="removable"
									value={ing.id}
									checked={current?.removable ?? true}
								/> Cliente pode retirar</label
							>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-muted">
					Nenhum ingrediente cadastrado. Cadastre em <a
						class="underline"
						href="/staff/menu/ingredients">Ingredientes</a
					>.
				</p>
			{/if}
		</fieldset>

		<div>
			<label class="label" for="allergens"
				>Outros alergênicos (separados por vírgula; os dos ingredientes entram sozinhos)</label
			>
			<input
				class="field"
				id="allergens"
				name="allergens"
				value={p.allergens.join(', ')}
				placeholder="glúten, lactose"
			/>
		</div>

		{#if data.isNew}
			<div>
				<label class="label" for="sku">Código (SKU), opcional</label>
				<input
					class="field uppercase"
					id="sku"
					name="sku"
					maxlength="40"
					pattern="[A-Za-z0-9-]+"
					placeholder="Gerado a partir do nome"
				/>
				<p class="mt-1 text-xs text-muted">
					Use o mesmo código como "código externo" no cardápio do iFood. Não pode ser mudado depois.
				</p>
			</div>
		{:else}
			<p class="text-sm text-muted">
				Código (SKU): <strong>{p.sku}</strong>. Use este código como "código externo" no cardápio do
				iFood.
			</p>
		{/if}

		<label class="flex min-h-11 items-center gap-3"
			><input type="checkbox" class="size-5" name="active" checked={p.active} /> Mostrar no cardápio</label
		>
		<button class="btn-primary w-full" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
	</form>

	{#if !data.isNew}
		<section class="card p-4">
			{#if confirmDelete}
				<form method="POST" action="?/delete" use:enhance class="space-y-2">
					<p class="text-sm">
						Apagar <strong>{p.name}</strong>? Pedidos antigos continuam com o nome e o preço da
						época. Para tirar do cardápio por um tempo, desmarque "Mostrar no cardápio".
					</p>
					<div class="flex gap-2">
						<button class="btn-danger">Apagar produto</button>
						<button type="button" class="btn-ghost" onclick={() => (confirmDelete = false)}
							>Cancelar</button
						>
					</div>
				</form>
			{:else}
				<button class="btn-ghost text-bad" onclick={() => (confirmDelete = true)}
					>Apagar produto…</button
				>
			{/if}
		</section>
	{/if}
</main>
