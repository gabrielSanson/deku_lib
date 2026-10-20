<script lang="ts">
	import { cart } from '#lib/client/cart.svelte.ts';
	import Money from '#lib/components/Money.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Carrinho · {data.shopName}</title></svelte:head>

<section class="space-y-4 py-4">
	<h1 class="text-2xl font-black">Seu pedido</h1>
	{#if !cart.ready}
		<p class="text-muted">Carregando…</p>
	{:else if cart.lines.length === 0}
		<div class="card p-8 text-center">
			<p class="mb-4 text-muted">Seu carrinho está vazio.</p>
			<a href="/" class="btn-primary">Ver cardápio</a>
		</div>
	{:else}
		<ul class="divide-y divide-line card">
			{#each cart.lines as l (l.key)}
				<li class="flex gap-3 p-3">
					<div class="flex-1">
						<p class="font-semibold">{l.name}</p>
						{#if l.options.length}<p class="text-sm text-muted">
								{l.options
									.map((o) => (o.quantity > 1 ? `${o.quantity}× ${o.name}` : o.name))
									.join(', ')}
							</p>{/if}
						{#if l.note}<p class="text-sm text-muted italic">“{l.note}”</p>{/if}
						<div class="mt-2 flex items-center gap-1">
							<button
								class="btn-secondary min-h-9 px-3"
								onclick={() => cart.setQuantity(l.key, l.quantity - 1)}
								aria-label="Remover um {l.name}">−</button
							>
							<span class="w-8 text-center tabular-nums">{l.quantity}</span>
							<button
								class="btn-secondary min-h-9 px-3"
								onclick={() => cart.setQuantity(l.key, Math.min(50, l.quantity + 1))}
								aria-label="Adicionar um {l.name}">+</button
							>
						</div>
					</div>
					<Money cents={l.unitCents * l.quantity} class="font-semibold" />
				</li>
			{/each}
		</ul>
		<div class="flex justify-between text-lg font-bold">
			<span>Subtotal</span><Money cents={cart.subtotalCents} />
		</div>
		<p class="text-sm text-muted">Taxa de entrega e total final são calculados na próxima etapa.</p>
		<a
			href="/checkout"
			class="btn-primary w-full text-lg {data.store.open ? '' : 'pointer-events-none opacity-50'}"
			aria-disabled={!data.store.open}>Continuar</a
		>
		<a href="/" class="btn-ghost w-full">Adicionar mais itens</a>
	{/if}
</section>
