<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import Money from '#lib/components/atoms/Money.svelte';

	let { data, form } = $props();
	const hidden = $derived(new Set(data.hidden));
	const productsOf = (categoryId: string) =>
		data.catalog.products.filter((p) => p.categoryId === categoryId);
	let renaming = $state<string | null>(null);
</script>

<svelte:head><title>Editar cardápio · Equipe</title></svelte:head>

<main class="mx-auto max-w-4xl space-y-5 p-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="page-title">Editar cardápio</h1>
		<div class="flex flex-wrap gap-2">
			<a class="btn-ghost" href="/staff/menu">Disponibilidade</a>
			<a class="btn-ghost" href="/staff/menu/pages">Páginas do site</a>
			{#if data.categories.length}
				<a class="btn-primary" href="/staff/menu/products/novo">Novo produto</a>
			{/if}
		</div>
	</div>
	<FormError message={form?.error} />
	{#if form?.ok}<p class="alert-ok">{form.ok}</p>{/if}

	{#if data.empty}
		<section class="space-y-2 card p-4">
			<h2 class="font-semibold">O cardápio está vazio</h2>
			<p class="text-sm text-muted">
				Crie uma categoria (por exemplo "Burgers") e depois os produtos. Ou comece com o cardápio de
				exemplo e ajuste nomes, preços e fotos.
			</p>
			<form method="POST" action="?/sample" use:enhance>
				<button class="btn-secondary">Carregar cardápio de exemplo</button>
			</form>
		</section>
	{/if}

	<section class="space-y-2">
		<h2 class="font-semibold">Categorias e produtos</h2>
		{#each data.categories as c (c.id)}
			<div class="card">
				<div class="flex flex-wrap items-center gap-2 border-b border-line p-3">
					{#if renaming === c.id}
						<form
							method="POST"
							action="?/category"
							use:enhance={() =>
								async ({ update }) => {
									await update();
									renaming = null;
								}}
							class="flex flex-1 flex-wrap gap-2"
						>
							<input type="hidden" name="id" value={c.id} />
							<input class="field flex-1" name="name" value={c.name} required maxlength="80" />
							<input
								class="field w-24"
								name="position"
								type="number"
								value={c.position}
								aria-label="Ordem"
							/>
							<select class="field w-36" name="active" value={c.active ? '1' : '0'}>
								<option value="1">Visível</option>
								<option value="0">Oculta</option>
							</select>
							<button class="btn-primary">Salvar</button>
							<button type="button" class="btn-ghost" onclick={() => (renaming = null)}
								>Cancelar</button
							>
						</form>
					{:else}
						<h3 class="flex-1 font-semibold">
							{c.name}
							{#if !c.active}<span class="text-xs font-normal text-muted">(oculta)</span>{/if}
						</h3>
						<button class="btn-ghost min-h-9 text-sm" onclick={() => (renaming = c.id)}
							>Editar</button
						>
						{#if c.products === 0}
							<form method="POST" action="?/deleteCategory" use:enhance>
								<input type="hidden" name="id" value={c.id} />
								<button class="btn-ghost min-h-9 text-sm text-bad">Apagar</button>
							</form>
						{/if}
					{/if}
				</div>
				<ul class="divide-y divide-line">
					{#each productsOf(c.id) as p (p.sku)}
						<li>
							<a
								href="/staff/menu/products/{p.sku}"
								class="flex items-center gap-3 p-3 hover:bg-stone-50"
							>
								{#if p.imageUrl}
									<img src={p.imageUrl} alt="" class="size-10 rounded object-cover" />
								{:else}
									<span class="size-10 rounded bg-stone-100"></span>
								{/if}
								<span class="flex-1">
									<span class="font-medium">{p.name}</span>
									<span class="text-xs text-muted">{p.sku}</span>
									{#if hidden.has(p.sku)}<span class="text-xs text-warn"> · oculto</span>{/if}
								</span>
								<Money cents={p.priceCents} class="text-sm text-muted" />
							</a>
						</li>
					{:else}
						<li class="p-3 text-sm text-muted">Nenhum produto nesta categoria.</li>
					{/each}
				</ul>
			</div>
		{/each}
		<form method="POST" action="?/category" use:enhance class="flex gap-2 card p-3">
			<input
				class="field flex-1"
				name="name"
				placeholder="Nova categoria, por exemplo Bebidas"
				required
				maxlength="80"
			/>
			<input type="hidden" name="position" value={data.categories.length + 1} />
			<button class="btn-secondary">Adicionar categoria</button>
		</form>
	</section>

	<section class="space-y-2">
		<div class="flex items-center justify-between">
			<h2 class="font-semibold">Grupos de opções</h2>
			<a class="btn-secondary min-h-9 text-sm" href="/staff/menu/groups/novo">Novo grupo</a>
		</div>
		<p class="text-sm text-muted">
			Adicionais, ponto da carne, tamanhos. Um grupo pode ser usado em vários produtos.
		</p>
		<ul class="divide-y divide-line card">
			{#each data.groups as g (g.id)}
				<li>
					<a href="/staff/menu/groups/{g.id}" class="flex items-center gap-3 p-3 hover:bg-stone-50">
						<span class="flex-1 font-medium">{g.name}</span>
						<span class="text-xs text-muted"
							>{g.options} opções · escolhe {g.min_selections === g.max_selections
								? g.min_selections
								: `${g.min_selections} a ${g.max_selections}`} · em {g.products} produtos</span
						>
					</a>
				</li>
			{:else}
				<li class="p-3 text-sm text-muted">Nenhum grupo ainda.</li>
			{/each}
		</ul>
	</section>
</main>
