<script lang="ts">
	import Money from '#lib/components/Money.svelte';

	let { data } = $props();
	const soldOut = $derived(new Set(data.soldOut));
	const sections = $derived(
		data.catalog.categories
			.slice()
			.sort((a, b) => a.position - b.position)
			.map((c) => ({ ...c, products: data.catalog.products.filter((p) => p.categoryId === c.id) }))
			.filter((c) => c.products.length)
	);
</script>

<svelte:head>
	<title>{data.shopName} · Cardápio</title>
	<meta name="description" content="Peça seus burgers online para retirada ou entrega." />
</svelte:head>

<section class="py-6">
	<h1 class="text-3xl font-black">Cardápio</h1>
	<p class="text-muted">
		{data.store.open ? `Pronto em cerca de ${data.store.prepTimeMinutes} min.` : 'Pedidos online pausados no momento.'}
		{data.store.pickup ? 'Retirada' : ''}{data.store.pickup && data.store.delivery ? ' e ' : ''}{data.store.delivery ? 'entrega' : ''}.
	</p>
</section>

<nav class="sticky top-[57px] z-10 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-canvas px-4 py-2" aria-label="Categorias">
	{#each sections as s (s.id)}
		<a href="#{s.slug}" class="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium whitespace-nowrap">{s.name}</a>
	{/each}
</nav>

{#each sections as s (s.id)}
	<section id={s.slug} class="mb-8 scroll-mt-32">
		<h2 class="mb-3 text-xl font-bold">{s.name}</h2>
		<ul class="space-y-3">
			{#each s.products as p (p.sku)}
				{@const out = soldOut.has(p.sku)}
				<li>
					<a href="/menu/{p.slug}" class="card flex gap-3 p-3 {out ? 'pointer-events-none opacity-50' : 'hover:border-brand-500'}" aria-disabled={out}>
						<div class="flex-1">
							<h3 class="font-semibold">{p.name}</h3>
							<p class="line-clamp-2 text-sm text-muted">{p.description}</p>
							<p class="mt-1 font-bold"><Money cents={p.priceCents} />{#if out}<span class="ml-2 text-xs text-bad">Esgotado</span>{/if}</p>
						</div>
						{#if p.imageUrl}
							<img src={p.imageUrl} alt="" class="size-24 rounded-lg object-cover" loading="lazy" width="96" height="96" />
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/each}
