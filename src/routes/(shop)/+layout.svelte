<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { cart } from '#lib/client/cart.svelte.ts';
	import { lastOrder } from '#lib/client/last-order.ts';
	import Icon from '#lib/components/Icon.svelte';
	import Money from '#lib/components/Money.svelte';
	import CartPanel from './CartPanel.svelte';

	let { data, children } = $props();
	let orderToken = $state<string | null>(null);
	let drawer = $state<HTMLElement>();
	onMount(() => {
		cart.init();
		orderToken = lastOrder();
	});

	const path = $derived(page.url.pathname);
	const isHome = $derived(path === '/');
	const onCheckout = $derived(
		path.startsWith('/cart') || path.startsWith('/checkout') || path.startsWith('/orders')
	);
	const showCartBar = $derived(cart.count > 0 && !onCheckout && !cart.panelOpen);

	// On the menu page at desktop width the cart is docked beside the menu, so the
	// header button points there instead of opening the drawer.
	function openCart() {
		const docked = document.getElementById('seu-pedido');
		if (isHome && docked && matchMedia('(min-width: 1024px)').matches) {
			docked.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			docked.focus({ preventScroll: true });
		} else cart.panelOpen = true;
	}
	const close = () => (cart.panelOpen = false);

	$effect(() => {
		if (!cart.panelOpen) return;
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
		window.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';
		tick().then(() => drawer?.querySelector<HTMLElement>('button, a')?.focus());
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
		};
	});
	// Leaving the page (e.g. "Finalizar pedido") closes the drawer.
	$effect(() => {
		void path;
		cart.panelOpen = false;
	});

	const nav = $derived([
		{ href: '/', label: 'Cardápio', icon: 'burger' as const, active: isHome },
		{ href: '/#como-pedir', label: 'Como pedir', icon: 'receipt' as const, active: false },
		...(orderToken
			? [
					{
						href: `/orders/${orderToken}`,
						label: 'Acompanhar pedido',
						icon: 'pin' as const,
						active: path.startsWith('/orders')
					}
				]
			: [])
	]);
</script>

<svelte:head>
	<meta name="theme-color" content="#0b0b0b" />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="sticky top-0 z-30 border-b border-night-line bg-night text-white">
		<div
			class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 lg:px-6"
		>
			<a href="/" class="flex shrink-0 items-center gap-2.5" aria-label="{data.shopName}, início">
				<img src="/brand/deku-mark.png" alt="" class="h-10 w-auto sm:h-14" width="35" height="52" />
				<img
					src="/brand/deku-wordmark.png"
					alt={data.shopName}
					class="h-6 w-auto sm:h-9"
					width="83"
					height="26"
				/>
			</a>
			<nav class="hidden items-center gap-1 md:flex" aria-label="Principal">
				{#each nav as n (n.href)}
					<a
						href={n.href}
						class="flex items-center gap-2 border-b-2 px-4 py-6 text-[15px] font-semibold transition-colors {n.active
							? 'border-brand-500 text-brand-500'
							: 'border-transparent text-white hover:text-brand-400'}"
						aria-current={n.active ? 'page' : undefined}
					>
						<Icon name={n.icon} />{n.label}
					</a>
				{/each}
			</nav>
			<button
				class="relative grid size-12 place-items-center rounded-full hover:bg-night-2"
				onclick={openCart}
				aria-label="Carrinho, {cart.count} {cart.count === 1 ? 'item' : 'itens'}"
			>
				<Icon name="cart" class="size-8" strokeWidth={1.75} />
				{#if cart.count}
					<span
						class="absolute top-0.5 right-0 grid min-w-6 place-items-center rounded-full bg-brand-500 px-1 text-xs leading-6 font-black text-black tabular-nums"
						>{cart.count}</span
					>
				{/if}
			</button>
		</div>
		{#if !data.store.open}
			<p class="bg-red-700 px-4 py-2 text-center text-sm font-semibold text-white" role="status">
				{data.store.pauseReason ?? 'Não estamos aceitando pedidos online agora.'}
			</p>
		{/if}
	</header>

	{#if isHome}
		<div class="flex-1">{@render children()}</div>
	{:else}
		<div class="mx-auto w-full max-w-3xl flex-1 px-4 pb-28">
			{@render children()}
		</div>
	{/if}

	<footer class="bg-night text-stone-300">
		<div class="mx-auto max-w-7xl space-y-5 px-4 py-8 text-center lg:px-6">
			<p
				class="flex items-center justify-center gap-4 text-xs font-bold tracking-[0.2em] text-brand-500 uppercase sm:tracking-[0.35em]"
			>
				<span class="h-0.5 w-6 shrink-0 bg-brand-500 sm:w-10"></span>Burger de verdade é aqui<span
					class="h-0.5 w-6 shrink-0 bg-brand-500 sm:w-10"
				></span>
			</p>
			<nav class="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
				<a href="/p/sobre" class="hover:text-white">Sobre</a>
				<a href="/p/alergenicos" class="hover:text-white">Alergênicos</a>
				<a href="/p/privacidade" class="hover:text-white">Privacidade</a>
				<a href="/p/entrega" class="hover:text-white">Entrega e trocas</a>
			</nav>
		</div>
	</footer>

	{#if showCartBar}
		<button
			onclick={() => (cart.panelOpen = true)}
			class="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-3xl items-center justify-between rounded-full bg-brand-500 px-6 py-4 font-bold text-black shadow-xl ring-2 ring-black/10 {isHome
				? 'lg:hidden'
				: ''}"
		>
			<span class="flex items-center gap-2"
				><Icon name="cart" /> Ver carrinho · {cart.count}
				{cart.count === 1 ? 'item' : 'itens'}</span
			>
			<Money cents={cart.subtotalCents} />
		</button>
	{/if}

	{#if cart.panelOpen}
		<div class="fixed inset-0 z-40">
			<button
				class="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
				onclick={close}
				aria-label="Fechar carrinho"
				tabindex="-1"
			></button>
			<div
				class="absolute inset-y-0 right-0 flex w-full max-w-md p-2 sm:p-3"
				role="dialog"
				aria-modal="true"
				bind:this={drawer}
				aria-label="Seu pedido"
			>
				<div class="w-full">
					<CartPanel products={data.catalog.products} store={data.store} onclose={close} />
				</div>
			</div>
		</div>
	{/if}
</div>
