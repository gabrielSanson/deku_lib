<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import Money from '#lib/components/Money.svelte';
	import { unavailableReason } from '#lib/domain/catalog.ts';
	import { formatTime } from '#lib/domain/time.ts';

	let { data, form } = $props();
	const out = $derived(new Map(data.overrides.map((o) => [o.sku, o])));
	const missing = $derived(new Set(data.ingredients.filter((i) => !i.available).map((i) => i.id)));
	const optionSkus = $derived(
		[
			...new Map(
				data.catalog.products
					.flatMap((p) => p.modifierGroups.flatMap((g) => g.options))
					.map((o) => [o.sku, o])
			).values()
		].filter((o) => o.priceCents > 0)
	);
</script>

<svelte:head><title>Cardápio · Equipe</title></svelte:head>

<main class="mx-auto max-w-4xl space-y-4 p-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-xl font-bold">Disponibilidade do cardápio</h1>
		{#if data.staff.role === 'owner' || data.staff.role === 'manager'}
			<a class="btn-secondary" href="/staff/menu/edit">Editar cardápio</a>
		{/if}
	</div>
	<p class="text-sm text-muted">
		Marcar como esgotado vale na hora para o caixa, o site e (quando ativo) o iFood. O produto
		continua cadastrado.
	</p>
	<FormError message={form?.error} />

	{#if data.catalog.products.length === 0}
		<p class="alert-warn">
			O cardápio está vazio. {data.staff.role === 'owner' || data.staff.role === 'manager'
				? 'Cadastre os produtos em "Editar cardápio".'
				: 'Peça ao gerente para cadastrar os produtos.'}
		</p>
	{/if}

	{#each data.catalog.categories as c (c.id)}
		<section>
			<h2 class="mb-2 font-semibold">{c.name}</h2>
			<div class="divide-y divide-line card">
				{#each data.catalog.products.filter((p) => p.categoryId === c.id) as p (p.sku)}
					{@const o = out.get(p.sku)}
					<form method="POST" action="?/toggle" use:enhance class="flex items-center gap-3 p-3">
						<input type="hidden" name="sku" value={p.sku} />
						<input type="hidden" name="soldOut" value={o ? '0' : '1'} />
						<div class="flex-1">
							<p class="font-medium">{p.name} <span class="text-xs text-muted">{p.sku}</span></p>
							{#if o}<p class="text-xs text-bad">Esgotado desde {formatTime(o.updated_at)}</p>
							{:else if unavailableReason(p, new Set(), missing)}<p class="text-xs text-bad">
									Indisponível: {unavailableReason(p, new Set(), missing)}
								</p>
							{:else if p.ingredients.some((i) => missing.has(i.id))}<p class="text-xs text-warn">
									Sai sem {p.ingredients
										.filter((i) => missing.has(i.id))
										.map((i) => i.name.toLowerCase())
										.join(', ')}
								</p>{/if}
						</div>
						<Money cents={p.priceCents} class="text-sm text-muted" />
						<button class="btn min-h-9 text-sm {o ? 'bg-bad text-white' : 'btn-secondary'}"
							>{o ? 'Esgotado · voltar' : 'Marcar esgotado'}</button
						>
					</form>
				{/each}
			</div>
		</section>
	{/each}

	{#if data.ingredients.length}
		<section>
			<h2 class="mb-1 font-semibold">Ingredientes</h2>
			<p class="mb-2 text-sm text-muted">
				Se um ingrediente acabar, os produtos que não saem sem ele ficam indisponíveis; nos outros o
				cliente precisa pedir "sem".
			</p>
			<div class="divide-y divide-line card">
				{#each data.ingredients as ing (ing.id)}
					<form method="POST" action="?/ingredient" use:enhance class="flex items-center gap-3 p-3">
						<input type="hidden" name="id" value={ing.id} />
						<input type="hidden" name="available" value={ing.available ? '0' : '1'} />
						<div class="flex-1">
							<p class="font-medium">{ing.name}</p>
							{#if !ing.available && ing.unavailableAt}<p class="text-xs text-bad">
									Em falta desde {formatTime(ing.unavailableAt)}
								</p>{/if}
						</div>
						<button
							class="btn min-h-9 text-sm {ing.available ? 'btn-secondary' : 'bg-bad text-white'}"
							>{ing.available ? 'Marcar em falta' : 'Em falta · voltar'}</button
						>
					</form>
				{/each}
			</div>
		</section>
	{/if}

	{#if optionSkus.length}
		<section>
			<h2 class="mb-2 font-semibold">Adicionais</h2>
			<div class="divide-y divide-line card">
				{#each optionSkus as opt (opt.sku)}
					{@const o = out.get(opt.sku)}
					<form method="POST" action="?/toggle" use:enhance class="flex items-center gap-3 p-3">
						<input type="hidden" name="sku" value={opt.sku} />
						<input type="hidden" name="soldOut" value={o ? '0' : '1'} />
						<p class="flex-1 font-medium">{opt.name}</p>
						<button class="btn min-h-9 text-sm {o ? 'bg-bad text-white' : 'btn-secondary'}"
							>{o ? 'Esgotado · voltar' : 'Marcar esgotado'}</button
						>
					</form>
				{/each}
			</div>
		</section>
	{/if}
</main>
