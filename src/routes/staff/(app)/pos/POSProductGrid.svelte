<script lang="ts">
	import Icon from '#lib/components/atoms/Icon.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import ProductImage from '#lib/components/atoms/ProductImage.svelte';
	import type { Product } from '#lib/domain/catalog.ts';

	// The tiles staff tap to add a product to the ticket.
	let {
		products,
		soldOut,
		onpick
	}: {
		products: Product[];
		soldOut: Set<string>;
		onpick: (product: Product) => void;
	} = $props();
</script>

<div
	class="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-3 sm:grid-cols-3 xl:grid-cols-4"
>
	{#each products as p (p.sku)}
		{@const out = soldOut.has(p.sku)}
		<button
			class="flex flex-col overflow-hidden card text-left transition-colors hover:border-brand-500 disabled:opacity-50 disabled:hover:border-line"
			disabled={out}
			onclick={() => onpick(p)}
		>
			<ProductImage src={p.imageUrl} class="aspect-[4/3] w-full" />
			<span class="flex flex-1 flex-col gap-1 p-3">
				<span class="leading-tight font-bold">{p.name}</span>
				<span class="line-clamp-2 text-xs text-muted">{p.description}</span>
				<span class="mt-auto flex items-center justify-between pt-2">
					<Money cents={p.priceCents} class="font-black" />
					{#if out}
						<span class="text-xs font-semibold text-bad">Esgotado</span>
					{:else}
						<span class="grid size-9 place-items-center rounded-full bg-brand-500 text-black">
							<Icon name="plus" class="size-5" strokeWidth={3} />
						</span>
					{/if}
				</span>
			</span>
		</button>
	{:else}
		<p class="col-span-full p-6 text-center text-muted">Nenhum produto encontrado.</p>
	{/each}
</div>
