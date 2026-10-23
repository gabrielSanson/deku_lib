<script lang="ts">
	import IconButton from '#lib/components/atoms/IconButton.svelte';
	import { cart } from '#lib/client/cart.svelte.ts';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import type { Product } from '#lib/domain/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let {
		products,
		store,
		logo,
		onclose
	}: {
		products: Product[];
		/** The shop's small logo, shown where a photo is missing. */
		logo: string;
		store: {
			open: boolean;
			delivery: boolean;
			pixKey: boolean;
		};
		/** Present when the panel is a closable drawer. */
		onclose?: () => void;
	} = $props();

	const t = useTexts();
	const images = $derived(new Map(products.map((p) => [p.sku, p.imageUrl])));
	const payHint = $derived(store.pixKey ? t('cart.pay.pix') : '');
</script>

<div class="flex h-full flex-col rounded-3xl bg-night text-white shadow-2xl ring-1 ring-night-line">
	<header class="flex items-center gap-3 border-b border-night-line px-6 py-5">
		<Icon name="cart" class="size-7 text-brand-500" />
		<h2 class="text-xl font-bold">{t('cart.title')}</h2>
		{#if cart.count}
			<span
				class="grid size-6 place-items-center rounded-full bg-brand-500 text-xs font-black text-black tabular-nums"
				>{cart.count}</span
			>
		{/if}
		{#if onclose}
			<IconButton
				label={t('cart.close')}
				icon="close"
				variant="night"
				onclick={onclose}
				class="ml-auto"
			/>
		{/if}
	</header>

	{#if !cart.ready}
		<p class="px-6 py-8 text-stone-400">{t('errors.loading')}</p>
	{:else if cart.lines.length === 0}
		<div class="grid flex-1 place-items-center px-6 py-10 text-center">
			<div>
				<img src={logo} alt="" class="mx-auto mb-4 h-20 w-auto opacity-30" />
				<p class="font-semibold">{t('cart.empty')}</p>
				<p class="mt-1 text-sm text-stone-400">{t('cart.emptyHint')}</p>
			</div>
		</div>
	{:else}
		<ul class="min-h-0 flex-1 divide-y divide-night-line overflow-y-auto px-6">
			{#each cart.lines as l (l.key)}
				{@const img = images.get(l.sku)}
				<li class="flex gap-4 py-4">
					<div
						class="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-night-2 ring-1 ring-night-line"
					>
						{#if img}
							<img src={img} alt="" class="size-full object-cover" loading="lazy" />
						{:else}
							<img src={logo} alt="" class="h-12 w-auto opacity-40" />
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<p class="font-bold">{l.name}</p>
						{#if l.options.length}<p class="truncate text-xs text-stone-400">
								{l.options
									.map((o) => (o.quantity > 1 ? `${o.quantity}× ${o.name}` : o.name))
									.join(', ')}
							</p>{/if}
						{#if l.note}<p class="truncate text-xs text-stone-400 italic">“{l.note}”</p>{/if}
						<Money cents={l.unitCents * l.quantity} class="mt-0.5 block font-semibold" />
						<div class="mt-2 flex items-center justify-between">
							<div class="flex items-center rounded-full ring-1 ring-stone-600">
								<button
									class="grid size-8 place-items-center rounded-full hover:bg-night-2"
									onclick={() => cart.setQuantity(l.key, l.quantity - 1)}
									aria-label={t('cart.removeOne', { item: l.name })}
									><Icon name="minus" class="size-4" /></button
								>
								<span class="w-7 text-center text-sm font-semibold tabular-nums">{l.quantity}</span>
								<button
									class="grid size-8 place-items-center rounded-full hover:bg-night-2"
									onclick={() => cart.setQuantity(l.key, Math.min(50, l.quantity + 1))}
									aria-label={t('cart.addOne', { item: l.name })}
									><Icon name="plus" class="size-4" /></button
								>
							</div>
							<IconButton
								label={t('cart.remove', { item: l.name })}
								icon="trash"
								variant="night"
								size="sm"
								onclick={() => cart.setQuantity(l.key, 0)}
							/>
						</div>
					</div>
				</li>
			{/each}
		</ul>

		<div class="space-y-2 border-t border-night-line px-6 pt-5 text-stone-200">
			<div class="flex justify-between">
				<span>{t('cart.subtotal')}</span><Money cents={cart.subtotalCents} />
			</div>
			{#if store.delivery}
				<div class="flex justify-between gap-4">
					<span>{t('cart.deliveryFee')}</span><span class="text-sm text-stone-400"
						>{t('cart.deliveryFeeLater')}</span
					>
				</div>
			{/if}
		</div>
		<div class="mx-6 mt-4 flex items-baseline justify-between border-t border-night-line pt-4">
			<span class="text-lg font-bold">{t('cart.total')}</span>
			<Money cents={cart.subtotalCents} class="font-display text-3xl text-brand-500" />
		</div>
		{#if store.delivery}<p class="px-6 text-right text-xs text-stone-400">
				{t('cart.plusDelivery')}
			</p>{/if}
	{/if}

	<div class="space-y-4 px-6 pt-5 pb-6">
		{#if store.open && cart.count}
			<a
				href="/checkout"
				class="btn-primary min-h-13 w-full rounded-full text-lg"
				onclick={() => onclose?.()}
			>
				{t('cart.checkout')}
				<Icon name="arrow" />
			</a>
		{:else}
			<button type="button" class="btn-primary min-h-13 w-full rounded-full text-lg" disabled>
				{store.open ? t('cart.checkout') : t('cart.closedNow')}
				<Icon name="arrow" />
			</button>
		{/if}
		{#if payHint}
			<p class="flex items-center gap-3 text-sm">
				<Icon name="lock" class="size-6 shrink-0 text-brand-500" />
				<span
					><span class="block font-semibold">{t('cart.securePayment')}</span><span
						class="block text-xs text-stone-400 first-letter:uppercase">{payHint}</span
					></span
				>
			</p>
		{/if}
	</div>
</div>
