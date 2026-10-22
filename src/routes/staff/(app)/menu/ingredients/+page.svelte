<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';

	let { data, form } = $props();
	let editing = $state<string | null>(null);
	let confirming = $state<string | null>(null);
</script>

<svelte:head><title>Ingredientes · Cardápio</title></svelte:head>

<main class="mx-auto max-w-3xl space-y-4 p-4">
	<div>
		<h1 class="page-title">Ingredientes</h1>
		<p class="text-sm text-muted">
			Cadastre aqui o que vai nos produtos e marque em cada produto quais ingredientes ele usa. Os
			alergênicos dos ingredientes aparecem sozinhos no produto. Quando um ingrediente acabar,
			marque em <a class="underline" href="/staff/menu">Disponibilidade</a>.
		</p>
	</div>
	<FormError message={form?.error} />

	<form
		method="POST"
		action="?/save"
		use:enhance
		class="grid gap-3 card p-4 sm:grid-cols-[2fr_2fr_auto] sm:items-end"
	>
		<div>
			<label class="label" for="new-name">Novo ingrediente</label>
			<input
				class="field"
				id="new-name"
				name="name"
				required
				maxlength="80"
				placeholder="Cebola roxa"
			/>
		</div>
		<div>
			<label class="label" for="new-allergens">Alergênicos (vírgula)</label>
			<input class="field" id="new-allergens" name="allergens" placeholder="lactose" />
		</div>
		<input type="hidden" name="position" value={data.ingredients.length} />
		<button class="btn-primary">Adicionar</button>
	</form>

	{#if data.ingredients.length === 0}
		<p class="alert-warn">Nenhum ingrediente ainda.</p>
	{:else}
		<ul class="divide-y divide-line card">
			{#each data.ingredients as ing (ing.id)}
				<li class="p-3">
					{#if editing === ing.id}
						<form
							method="POST"
							action="?/save"
							use:enhance={() =>
								async ({ result, update }) => {
									await update({ reset: false });
									if (result.type === 'success') editing = null;
								}}
							class="grid gap-3 sm:grid-cols-[2fr_2fr_5rem_auto] sm:items-end"
						>
							<input type="hidden" name="id" value={ing.id} />
							<div>
								<label class="label" for="name-{ing.id}">Nome</label>
								<input
									class="field"
									id="name-{ing.id}"
									name="name"
									value={ing.name}
									required
									maxlength="80"
								/>
							</div>
							<div>
								<label class="label" for="all-{ing.id}">Alergênicos</label>
								<input
									class="field"
									id="all-{ing.id}"
									name="allergens"
									value={ing.allergens.join(', ')}
								/>
							</div>
							<div>
								<label class="label" for="pos-{ing.id}">Ordem</label>
								<input
									class="field"
									id="pos-{ing.id}"
									name="position"
									type="number"
									value={ing.position}
								/>
							</div>
							<div class="flex gap-2">
								<button class="btn-primary">Salvar</button>
								<button type="button" class="btn-ghost" onclick={() => (editing = null)}
									>Cancelar</button
								>
							</div>
						</form>
					{:else}
						<div class="flex flex-wrap items-center gap-3">
							<div class="min-w-0 flex-1">
								<p class="font-medium">
									{ing.name}
									{#if !ing.available}<span
											class="ml-1 rounded-full bg-bad-tint px-2 py-0.5 text-xs font-semibold text-bad"
											>Em falta</span
										>{/if}
								</p>
								<p class="text-xs text-muted">
									{ing.allergens.length ? `Alergênicos: ${ing.allergens.join(', ')} · ` : ''}
									{ing.products.length
										? `Usado em ${ing.products.join(', ')}`
										: 'Não está em nenhum produto'}
								</p>
							</div>
							{#if confirming === ing.id}
								<form method="POST" action="?/delete" use:enhance class="flex items-center gap-2">
									<input type="hidden" name="id" value={ing.id} />
									<span class="text-sm">Apagar e tirar dos produtos?</span>
									<button class="btn-danger min-h-9 text-sm">Apagar</button>
									<button
										type="button"
										class="btn-ghost min-h-9 text-sm"
										onclick={() => (confirming = null)}>Não</button
									>
								</form>
							{:else}
								<button class="btn-secondary min-h-9 text-sm" onclick={() => (editing = ing.id)}
									>Editar</button
								>
								<button
									class="btn-ghost min-h-9 text-sm text-bad"
									onclick={() => (confirming = ing.id)}>Apagar…</button
								>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</main>
