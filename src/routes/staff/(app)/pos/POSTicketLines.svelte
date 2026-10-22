<script lang="ts">
	import Icon from '#lib/components/atoms/Icon.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import ProductImage from '#lib/components/atoms/ProductImage.svelte';
	import { lineUnitCents, type CartLine } from './cart.svelte.ts';

	// The lines on the current ticket, with quantity buttons and a remove button.
	let {
		lines,
		onchange,
		onremove
	}: {
		lines: CartLine[];
		onchange: (line: CartLine, delta: number) => void;
		onremove: (line: CartLine) => void;
	} = $props();
</script>

<ul class="space-y-3">
	{#each lines as line (line.key)}
		<li class="flex gap-3 rounded-(--radius-control) border border-line p-2">
			<ProductImage src={line.product.imageUrl} class="size-16 shrink-0 rounded-lg" />
			<div class="min-w-0 flex-1">
				<div class="flex items-start justify-between gap-2">
					<span class="leading-tight font-semibold">{line.product.name}</span>
					<button
						class="-mt-1 -mr-2 btn-ghost min-h-9 px-2 text-stone-500"
						aria-label="Remover {line.product.name}"
						onclick={() => onremove(line)}
					>
						<Icon name="close" class="size-4" />
					</button>
				</div>
				{#if line.options.length}
					<p class="text-xs text-muted">
						{line.options
							.map((o) => (o.quantity > 1 ? `${o.quantity}× ${o.name}` : o.name))
							.join(', ')}
					</p>
				{/if}
				{#if line.note || line.allergy}
					<p class="text-xs {line.allergy ? 'font-semibold text-bad' : 'text-muted'}">
						{line.allergy ? '⚠ Alergia. ' : ''}{line.note}
					</p>
				{/if}
				<div class="mt-2 flex items-center justify-between gap-2">
					<div class="flex items-center gap-1">
						<button
							class="grid size-9 place-items-center rounded-full bg-brand-500 font-black text-black"
							onclick={() => onchange(line, -1)}
							aria-label="Remover um">−</button
						>
						<span class="w-7 text-center font-bold tabular-nums">{line.quantity}</span>
						<button
							class="grid size-9 place-items-center rounded-full bg-brand-500 font-black text-black"
							onclick={() => onchange(line, 1)}
							aria-label="Adicionar um">+</button
						>
					</div>
					<span class="text-right">
						<Money cents={lineUnitCents(line)} class="block text-xs text-muted" />
						<Money cents={lineUnitCents(line) * line.quantity} class="font-bold" />
					</span>
				</div>
			</div>
		</li>
	{/each}
</ul>
