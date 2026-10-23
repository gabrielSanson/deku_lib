<script lang="ts">
	import EmptyState from '#lib/components/molecules/EmptyState.svelte';
	import { cart } from '#lib/client/cart.svelte.ts';
	import Money from '#lib/components/atoms/Money.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
</script>

<svelte:head><title>{t('cart.pageTitle', { name: data.shopName })}</title></svelte:head>

<section class="space-y-4 py-4">
	<h1 class="text-2xl font-black">{t('cart.title')}</h1>
	{#if !cart.ready}
		<p class="text-muted">{t('errors.loading')}</p>
	{:else if cart.lines.length === 0}
		<EmptyState title={t('cart.empty')}>
			{#snippet action()}<a href="/cardapio" class="btn-primary">{t('cart.seeMenu')}</a>{/snippet}
		</EmptyState>
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
								aria-label={t('cart.removeOne', { item: l.name })}>−</button
							>
							<span class="w-8 text-center tabular-nums">{l.quantity}</span>
							<button
								class="btn-secondary min-h-9 px-3"
								onclick={() => cart.setQuantity(l.key, Math.min(50, l.quantity + 1))}
								aria-label={t('cart.addOne', { item: l.name })}>+</button
							>
						</div>
					</div>
					<Money cents={l.unitCents * l.quantity} class="font-semibold" />
				</li>
			{/each}
		</ul>
		<div class="flex justify-between text-lg font-bold">
			<span>{t('cart.subtotal')}</span><Money cents={cart.subtotalCents} />
		</div>
		<p class="text-sm text-muted">{t('cart.nextStepNote')}</p>
		{#if data.store.open}
			<a href="/checkout" class="btn-primary w-full text-lg">{t('cart.continue')}</a>
		{:else}
			<button type="button" class="btn-primary w-full text-lg" disabled>{t('cart.continue')}</button
			>
		{/if}
		<a href="/cardapio" class="btn-ghost w-full">{t('cart.addMore')}</a>
	{/if}
</section>
