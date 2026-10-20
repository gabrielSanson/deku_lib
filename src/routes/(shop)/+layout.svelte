<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { cart } from '#lib/client/cart.svelte.ts';
	import Money from '#lib/components/Money.svelte';

	let { data, children } = $props();
	onMount(() => cart.init());
	const showCartBar = $derived(
		cart.count > 0 &&
			!page.url.pathname.startsWith('/cart') &&
			!page.url.pathname.startsWith('/checkout') &&
			!page.url.pathname.startsWith('/orders')
	);
</script>

<svelte:head>
	<meta name="theme-color" content="#ea580c" />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
		<div class="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
			<a href="/" class="text-xl font-black text-brand-700">{data.shopName}</a>
			<a
				href="/cart"
				class="btn-secondary min-h-10 px-3 text-sm"
				aria-label="Carrinho, {cart.count} itens"
			>
				🛒 <span class="tabular-nums">{cart.count}</span>
			</a>
		</div>
		{#if !data.store.open}
			<p class="bg-red-50 px-4 py-2 text-center text-sm font-medium text-bad" role="status">
				{data.store.pauseReason ?? 'Não estamos aceitando pedidos online agora.'}
			</p>
		{/if}
	</header>
	<div class="mx-auto w-full max-w-3xl flex-1 px-4 pb-28">
		{@render children()}
	</div>
	<footer class="border-t border-line py-6 text-center text-sm text-muted">
		<nav class="flex justify-center gap-4">
			<a href="/p/sobre">Sobre</a><a href="/p/alergenicos">Alergênicos</a><a href="/p/privacidade"
				>Privacidade</a
			><a href="/p/entrega">Entrega e trocas</a>
		</nav>
	</footer>
	{#if showCartBar}
		<a
			href="/cart"
			class="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-3xl items-center justify-between rounded-2xl bg-brand-600 px-5 py-4 font-bold text-white shadow-lg"
		>
			<span>Ver carrinho · {cart.count} {cart.count === 1 ? 'item' : 'itens'}</span>
			<Money cents={cart.subtotalCents} />
		</a>
	{/if}
</div>
