<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { cart } from '#lib/client/cart.svelte.ts';
	import { lastOrder } from '#lib/client/last-order.ts';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import { useTexts } from '#lib/texts/context.ts';
	import CartPanel from './CartPanel.svelte';
	import MoreMenu from './MoreMenu.svelte';

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
	// The tracking page is a slim shell: the code and the steps, no storefront footer.
	const slim = $derived(path.startsWith('/orders/'));
	// The product page has its own bottom bar with the add button. The bar stays in place
	// under the open drawer so focus can return to it. While it shows, it is the only way
	// to the cart: the ··· menu drops its cart entry.
	const showCartBar = $derived(cart.count > 0 && !onCheckout && !path.startsWith('/menu/'));

	const close = () => (cart.panelOpen = false);

	// The drawer is a modal dialog: the page behind is inert, Tab cycles inside it, Escape
	// closes it and focus goes back to what opened it (the ··· button when the menu item
	// that opened it is gone). Closing because the page changed leaves focus to the router.
	$effect(() => {
		if (!cart.panelOpen) return;
		const opener = document.activeElement as HTMLElement | null;
		const openedOn = untrack(() => path);
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
			else if (e.key === 'Tab' && drawer) trapTab(e, drawer);
		};
		window.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';
		tick().then(() => drawer?.querySelector<HTMLElement>('button, a')?.focus());
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
			if (untrack(() => path) !== openedOn) return;
			const back = opener?.isConnected && opener !== document.body ? opener : null;
			tick().then(() => (back ?? document.getElementById('shop-more-button'))?.focus());
		};
	});
	function trapTab(e: KeyboardEvent, box: HTMLElement) {
		const stops = [
			...box.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		];
		if (!stops.length) return;
		const first = stops[0];
		const last = stops[stops.length - 1];
		const inside = box.contains(document.activeElement);
		if (e.shiftKey && (document.activeElement === first || !inside)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && (document.activeElement === last || !inside)) {
			e.preventDefault();
			first.focus();
		}
	}
	// Leaving the page (e.g. "Finalizar pedido") closes the drawer.
	$effect(() => {
		void path;
		cart.panelOpen = false;
	});

	// The header holds only the two places to go; everything else is in the ··· menu.
	const nav = $derived([
		{ href: '/', label: t('header.nav.home'), active: isHome },
		{ href: '/cardapio', label: t('header.nav.menu'), active: isMenu }
	]);
	const accountHref = $derived(data.customer ? '/conta' : '/conta/entrar');
	// Order tracking has its own slim header (mockup 10): back arrow, wordmark and mascot.
	const slimHeader = $derived(path.startsWith('/orders/'));
</script>

<svelte:head>
	<meta name="theme-color" content={data.branding.colors.dark ?? '#0b0b0b'} />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<!-- Everything but the cart drawer; inert while the drawer is open. -->
	<div class="contents" inert={cart.panelOpen}>
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
			<header
				class="sticky top-0 z-30 bg-night text-white shadow-[0_1px_0_var(--color-night-line)]"
			>
				<div
					class="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:h-[4.5rem] sm:gap-4 lg:px-6"
				>
					<a
						href="/"
						class="flex shrink-0 items-center gap-2.5"
						aria-label={t('header.home', { name: data.shopName })}
					>
						<img src={data.branding.images.logo} alt="" class="h-10 w-auto sm:h-12" />
						<img
							src={data.branding.images.wordmark}
							alt={data.shopName}
							class="hidden h-7 w-auto sm:block"
						/>
					</a>
					<nav class="ml-auto flex items-center" aria-label={t('shell.shopNav')}>
						{#each nav as n (n.href)}
							<a
								href={n.href}
								class="relative px-3 py-2 text-[15px] font-semibold transition-colors sm:px-4 {n.active
									? 'text-white'
									: 'text-stone-300 hover:text-white'}"
								aria-current={n.active ? 'page' : undefined}
							>
								{n.label}
								{#if n.active}<span
										class="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand-500 sm:inset-x-4"
										aria-hidden="true"
									></span>{/if}
							</a>
						{/each}
					</nav>
					{#if data.kiosk}
						<button
							type="button"
							class="shrink-0 rounded-full bg-night-2 px-4 py-2.5 text-[15px] font-semibold transition-colors hover:bg-night-line"
							onclick={restart}>{t('header.kiosk.restart')}</button
						>
					{/if}
					<MoreMenu
						{accountHref}
						signedIn={!!data.customer}
						cartInBar={showCartBar}
						trackHref={orderToken ? `/orders/${orderToken}` : null}
						kiosk={data.kiosk}
					/>
				</div>
				{#if !data.store.open}
					<p
						class="bg-red-700 px-4 py-2 text-center text-sm font-semibold text-white"
						role="status"
					>
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
			<div class="mx-auto w-full max-w-3xl flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))]">
				{@render children()}
			</div>
		{/if}

		{#if !slim}<footer
				class="bg-night text-stone-400 {showCartBar
					? 'pb-[calc(5rem+env(safe-area-inset-bottom))]'
					: ''}"
			>
				<div class="mx-auto max-w-7xl space-y-5 px-4 py-8 text-center lg:px-6">
					<p
						class="flex items-center justify-center gap-4 text-xs font-bold tracking-[0.2em] text-brand-500 uppercase sm:tracking-[0.35em]"
					>
						<span class="h-0.5 w-6 shrink-0 bg-brand-500 sm:w-10"></span>{t('footer.tagline')}<span
							class="h-0.5 w-6 shrink-0 bg-brand-500 sm:w-10"
						></span>
					</p>
					<nav class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium">
						{#each data.pages as p (p.slug)}
							<a href="/p/{p.slug}" class="hover:text-white">{p.title}</a>
						{/each}
					</nav>
				</div>
			</footer>{/if}

		{#if showCartBar}
			<button
				onclick={() => (cart.panelOpen = true)}
				class="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-3xl items-center justify-between rounded-full bg-brand-500 px-6 py-4 font-bold text-black shadow-xl ring-2 ring-black/10"
			>
				<span class="flex items-center gap-2"
					><Icon name="cart" /> {t('cart.view', { count: cart.count, items })}</span
				>
				<Money cents={cart.subtotalCents} />
			</button>
		{/if}
	</div>

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
