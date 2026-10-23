<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { cart } from '#lib/client/cart.svelte.ts';
	import { lastOrder } from '#lib/client/last-order.ts';
	import ThemeToggle from '#lib/components/molecules/ThemeToggle.svelte';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import { useTexts } from '#lib/texts/context.ts';
	import CartPanel from './CartPanel.svelte';

	let { data, children } = $props();
	const t = useTexts();
	const items = $derived(t(cart.count === 1 ? 'cart.item' : 'cart.items'));
	let orderToken = $state<string | null>(null);
	let drawer = $state<HTMLElement>();
	onMount(() => {
		cart.init();
		// A table QR code links to /?mesa=7; checkout then defaults to eating in at that table.
		const table = page.url.searchParams.get('mesa');
		if (table) {
			try {
				sessionStorage.setItem('deku-mesa', table.slice(0, 20));
			} catch {
				/* private mode: the customer types the table at checkout */
			}
		}
		// The totem is shared: no "your last order" link for the next customer.
		orderToken = data.kiosk ? null : lastOrder();
	});

	// Totem: start over for the next customer.
	function restart() {
		cart.clear();
		cart.panelOpen = false;
		try {
			sessionStorage.removeItem('deku-mesa');
		} catch {
			/* nothing stored */
		}
		goto('/cardapio');
	}
	// Totem: an abandoned order is cleared after a while without a touch. The Pix
	// screen gets longer (the customer is paying on their phone); the order page
	// counts down on its own.
	$effect(() => {
		if (!data.kiosk) return;
		let last = Date.now();
		const touch = () => (last = Date.now());
		const events = ['pointerdown', 'keydown', 'scroll'] as const;
		for (const e of events) window.addEventListener(e, touch, { passive: true });
		const timer = setInterval(() => {
			const p = page.url.pathname;
			if (p.startsWith('/orders/') || (p === '/cardapio' && cart.count === 0)) return;
			const limit = p.startsWith('/checkout/payment/') ? 5 * 60_000 : 2 * 60_000;
			if (Date.now() - last > limit) {
				last = Date.now();
				restart();
			}
		}, 5_000);
		return () => {
			clearInterval(timer);
			for (const e of events) window.removeEventListener(e, touch);
		};
	});

	const path = $derived(page.url.pathname);
	const isHome = $derived(path === '/');
	const isMenu = $derived(path === '/cardapio');
	const onCheckout = $derived(
		path.startsWith('/cart') || path.startsWith('/checkout') || path.startsWith('/orders')
	);
	const showTabs = $derived(
		!data.kiosk && (path.startsWith('/orders') || !(onCheckout || path.startsWith('/menu/')))
	);
	// The tracking page is a slim shell: the code and the steps, no storefront footer.
	const slim = $derived(path.startsWith('/orders/'));
	const showCartBar = $derived(cart.count > 0 && !onCheckout && !cart.panelOpen);

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
		{ href: '/cardapio', label: t('header.nav.menu'), icon: 'burger' as const, active: isMenu },
		...(orderToken
			? [
					{
						href: `/orders/${orderToken}`,
						label: t('header.nav.track'),
						icon: 'pin' as const,
						active: path.startsWith('/orders')
					}
				]
			: [])
	]);

	// Desktop header: Cardápio, Meus pedidos (the account page lists orders).
	const desktopNav = $derived([
		nav[0],
		...(data.kiosk
			? []
			: [
					{
						href: data.customer ? '/conta' : '/conta/entrar',
						label: t('header.nav.mine'),
						icon: 'bag' as const,
						active: path.startsWith('/conta')
					}
				])
	]);

	const accountHref = $derived(data.customer ? '/conta' : '/conta/entrar');
	// Order tracking has its own slim header (mockup 10): back arrow, wordmark and mascot.
	const slimHeader = $derived(path.startsWith('/orders/'));
	const tabs = $derived([
		{ href: '/', label: t('header.nav.home'), icon: 'home' as const, active: isHome },
		{ href: '/cardapio', label: t('header.nav.menu'), icon: 'menu' as const, active: isMenu },
		...(orderToken
			? [
					{
						href: `/orders/${orderToken}`,
						label: t('header.tab.track'),
						icon: 'receipt' as const,
						active: path.startsWith('/orders')
					}
				]
			: []),
		{
			href: accountHref,
			label: t('account.tab'),
			icon: 'user' as const,
			active: path.startsWith('/conta')
		}
	]);
</script>

<svelte:head>
	<meta name="theme-color" content={data.branding.colors.dark ?? '#0b0b0b'} />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	{#if slimHeader}
		<header class="sticky top-0 z-30 bg-night text-white">
			<div class="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
				<a
					href="/cardapio"
					class="grid size-11 place-items-center rounded-full bg-night-2 hover:bg-night-line"
					aria-label={t('errors.backToMenu')}
				>
					<Icon name="back" class="size-5" />
				</a>
				<a
					href="/"
					class="flex items-center gap-2"
					aria-label={t('header.home', { name: data.shopName })}
				>
					<img src={data.branding.images.wordmark} alt={data.shopName} class="h-6 w-auto" />
				</a>
				<img src={data.branding.images.logo} alt="" class="h-10 w-auto" />
			</div>
		</header>
	{:else}
		<header class="sticky top-0 z-30 bg-night text-white shadow-[0_1px_0_var(--color-night-line)]">
			<div
				class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 lg:px-6"
			>
				<a
					href="/"
					class="flex shrink-0 items-center gap-2.5"
					aria-label={t('header.home', { name: data.shopName })}
				>
					<img src={data.branding.images.logo} alt="" class="h-10 w-auto sm:h-14" />
					<img src={data.branding.images.wordmark} alt={data.shopName} class="h-6 w-auto sm:h-9" />
				</a>
				<nav class="hidden items-center gap-1 md:flex" aria-label={t('shell.shopNav')}>
					{#each desktopNav as n (n.href)}
						<a
							href={n.href}
							class="flex items-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-semibold transition-colors {n.active
								? 'bg-brand-500 text-black'
								: 'text-stone-100 hover:bg-night-2 hover:text-brand-400'}"
							aria-current={n.active ? 'page' : undefined}
						>
							<Icon name={n.icon} />{n.label}
						</a>
					{/each}
				</nav>
				<a
					href="/cardapio"
					class="hidden shrink-0 items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-[15px] font-black text-black transition-colors hover:bg-brand-400 md:flex"
					>{t('header.order')}</a
				>
				{#if data.kiosk}
					<button
						type="button"
						class="flex shrink-0 items-center gap-2 rounded-full bg-night-2 px-4 py-2.5 text-[15px] font-semibold transition-colors hover:bg-night-line"
						onclick={restart}>{t('header.kiosk.restart')}</button
					>
				{/if}
				<a
					href={accountHref}
					class="hidden size-12 place-items-center rounded-full bg-night-2 transition-colors hover:bg-night-line {data.kiosk
						? ''
						: 'md:grid'} {path.startsWith('/conta') ? 'text-brand-500' : ''}"
					aria-label={t('account.tab')}
					aria-current={path.startsWith('/conta') ? 'page' : undefined}
				>
					<Icon name="user" class="size-7" strokeWidth={1.75} />
				</a>
				<ThemeToggle
					class="grid size-10 place-items-center rounded-full bg-night-2 text-white transition-colors hover:bg-night-line md:size-12"
				/>
				<button
					class="relative grid size-12 place-items-center rounded-full bg-night-2 transition-colors hover:bg-night-line"
					onclick={() => (cart.panelOpen = true)}
					aria-label={t('header.cart', { count: cart.count, items })}
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
					{data.store.pauseReason ??
						(data.store.outOfHours
							? t('header.closedUntil', { when: data.store.outOfHours })
							: t('header.closed'))}
				</p>
			{/if}
		</header>
	{/if}

	{#if isHome || isMenu}
		<div class="flex-1">{@render children()}</div>
	{:else}
		<div class="mx-auto w-full max-w-3xl flex-1 px-4 pb-28">
			{@render children()}
		</div>
	{/if}

	{#if !slim}<footer class="bg-night pb-16 text-stone-400 md:pb-0">
			<div class="mx-auto max-w-7xl space-y-5 px-4 py-8 text-center lg:px-6">
				<p
					class="flex items-center justify-center gap-4 text-xs font-bold tracking-[0.2em] text-brand-500 uppercase sm:tracking-[0.35em]"
				>
					<span class="h-0.5 w-6 shrink-0 bg-brand-500 sm:w-10"></span>{t('footer.tagline')}<span
						class="h-0.5 w-6 shrink-0 bg-brand-500 sm:w-10"
					></span>
				</p>
				<nav class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium">
					<a href="/p/sobre" class="hover:text-white">{t('footer.about')}</a>
					<a href="/p/alergenicos" class="hover:text-white">{t('footer.allergens')}</a>
					<a href="/p/privacidade" class="hover:text-white">{t('footer.privacy')}</a>
					<a href="/p/entrega" class="hover:text-white">{t('footer.delivery')}</a>
				</nav>
			</div>
		</footer>{/if}

	<!-- Bottom tabs on phones (mockup 03); the product page has its own bottom bar. -->
	{#if showTabs}
		<nav
			class="fixed inset-x-0 bottom-0 z-30 border-t border-night-line bg-night pb-[env(safe-area-inset-bottom)] text-stone-300 md:hidden"
			aria-label={t('header.nav.tabs')}
		>
			<ul class="mx-auto flex max-w-md">
				{#each tabs as tab (tab.href)}
					<li class="flex-1">
						<a
							href={tab.href}
							class="flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold {tab.active
								? 'text-brand-500'
								: 'hover:text-white'}"
							aria-current={tab.active ? 'page' : undefined}
						>
							<Icon name={tab.icon} class="size-6" />{tab.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}

	{#if showCartBar}
		<button
			onclick={() => (cart.panelOpen = true)}
			class="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-3xl items-center justify-between rounded-full bg-brand-500 px-6 py-4 font-bold text-black shadow-xl ring-2 ring-black/10 md:bottom-4"
		>
			<span class="flex items-center gap-2"
				><Icon name="cart" /> {t('cart.view', { count: cart.count, items })}</span
			>
			<Money cents={cart.subtotalCents} />
		</button>
	{/if}

	{#if cart.panelOpen}
		<div class="fixed inset-0 z-40">
			<button
				class="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
				onclick={close}
				aria-label={t('cart.close')}
				tabindex="-1"
			></button>
			<div
				class="absolute inset-y-0 right-0 flex w-full max-w-md p-2 sm:p-3"
				role="dialog"
				aria-modal="true"
				bind:this={drawer}
				aria-label={t('cart.title')}
			>
				<div class="w-full">
					<CartPanel
						products={data.catalog.products}
						store={data.store}
						logo={data.branding.images.logo}
						onclose={close}
					/>
				</div>
			</div>
		</div>
	{/if}
</div>
