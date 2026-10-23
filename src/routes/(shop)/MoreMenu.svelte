<script lang="ts">
	// The "···" button at the end of the shop header. It holds what is not navigation:
	// the order being tracked, the cart, the account and dark mode. A disclosure (button plus
	// list), so Tab moves through it like any other links.
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { cart } from '#lib/client/cart.svelte.ts';
	import { isDark, setDark } from '#lib/client/theme.ts';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let {
		accountHref,
		signedIn,
		trackHref,
		kiosk
	}: { accountHref: string; signedIn: boolean; trackHref: string | null; kiosk: boolean } =
		$props();
	const t = useTexts();
	let open = $state(false);
	let dark = $state(true);
	let root: HTMLElement;
	let button: HTMLButtonElement;
	onMount(() => (dark = isDark()));

	// Following a link closes the menu.
	$effect(() => {
		void page.url.pathname;
		open = false;
	});

	async function toggle() {
		open = !open;
		if (open) {
			await tick();
			root.querySelector<HTMLElement>('[data-item]')?.focus();
		}
	}
	function close(refocus = false) {
		open = false;
		if (refocus) button.focus();
	}
	function openCart() {
		close();
		cart.panelOpen = true;
	}
	function toggleDark() {
		dark = !dark;
		setDark(dark);
	}

	const item =
		'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-semibold text-stone-100 transition-colors hover:bg-night-line focus-visible:bg-night-line';
</script>

<svelte:window
	onclick={(e) => open && !root.contains(e.target as Node) && close()}
	onkeydown={(e) => open && e.key === 'Escape' && close(true)}
/>

<div class="relative" bind:this={root}>
	<button
		bind:this={button}
		type="button"
		class="relative grid size-11 place-items-center rounded-full text-white transition-colors hover:bg-night-2 {open
			? 'bg-night-2'
			: ''}"
		aria-label={cart.count
			? `${t('header.more')} · ${t('header.cart', { count: cart.count, items: t(cart.count === 1 ? 'cart.item' : 'cart.items') })}`
			: t('header.more')}
		aria-expanded={open}
		aria-controls="shop-more"
		onclick={toggle}
	>
		<Icon name="more" class="size-7" strokeWidth={3} />
		{#if cart.count}
			<span
				class="absolute top-0.5 right-0.5 grid min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[11px] leading-5 font-black text-black tabular-nums"
				aria-hidden="true">{cart.count}</span
			>
		{/if}
	</button>
	{#if open}
		<div
			id="shop-more"
			class="absolute top-full right-0 z-40 mt-2 w-64 rounded-2xl bg-night-2 p-1.5 shadow-2xl ring-1 ring-night-line"
		>
			<ul>
				{#if trackHref}
					<li>
						<a data-item href={trackHref} class={item}
							><Icon name="receipt" class="size-5 text-brand-500" />{t('header.nav.track')}</a
						>
					</li>
				{/if}
				<li>
					<button data-item type="button" class={item} onclick={openCart}>
						<Icon name="cart" class="size-5 text-brand-500" />
						<span class="flex-1">{t('header.more.cart')}</span>
						{#if cart.count}
							<span
								class="grid min-w-6 place-items-center rounded-full bg-brand-500 px-1.5 text-xs leading-6 font-black text-black tabular-nums"
								>{cart.count}</span
							>
						{/if}
					</button>
				</li>
				{#if !kiosk}
					<li>
						<a data-item href={accountHref} class={item}
							><Icon name="user" class="size-5 text-brand-500" />{t(
								signedIn ? 'header.more.account' : 'header.more.signIn'
							)}</a
						>
					</li>
				{/if}
				<li class="mt-1 border-t border-night-line pt-1">
					<button
						data-item
						type="button"
						role="switch"
						aria-checked={dark}
						class={item}
						onclick={toggleDark}
					>
						<Icon name="moon" class="size-5 text-brand-500" />
						<span class="flex-1">{t('header.more.dark')}</span>
						<span
							class="relative h-6 w-10 shrink-0 rounded-full transition-colors {dark
								? 'bg-brand-500'
								: 'bg-night-line'}"
							aria-hidden="true"
							><span
								class="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform {dark
									? 'translate-x-4'
									: ''}"
							></span></span
						>
					</button>
				</li>
			</ul>
		</div>
	{/if}
</div>
