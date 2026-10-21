<script lang="ts">
	// One dish on the menu: photo (or the logo on brand gradient), name, short
	// description, and the price with the add button on one row.
	import Icon from '#lib/components/atoms/Icon.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import type { Product } from '#lib/domain/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let {
		product: p,
		out = false,
		needsChoice = false,
		open = true,
		added = false,
		logo,
		onadd
	}: {
		product: Product;
		out?: boolean;
		/** Options or removable ingredients: the customer chooses on the dish page. */
		needsChoice?: boolean;
		open?: boolean;
		added?: boolean;
		logo: string;
		onadd?: () => void;
	} = $props();

	const t = useTexts();
</script>

<li
	class="flex flex-col overflow-hidden card transition-shadow hover:shadow-lg {out
		? 'opacity-60'
		: ''}"
>
	<a
		href="/menu/{p.slug}"
		class="relative block aspect-[16/9] overflow-hidden bg-night sm:aspect-[4/3]"
		tabindex="-1"
		aria-hidden="true"
	>
		{#if p.imageUrl}
			<img
				src={p.imageUrl}
				alt=""
				class="size-full object-cover transition-transform duration-300 hover:scale-105"
				loading="lazy"
			/>
		{:else}
			<div
				class="grid size-full place-items-center bg-[radial-gradient(circle_at_50%_60%,color-mix(in_srgb,var(--color-brand-500)_22%,transparent),transparent_65%)]"
			>
				<img src={logo} alt="" class="h-1/2 w-auto opacity-80" />
			</div>
		{/if}
		{#if out}
			<span
				class="absolute top-3 left-3 rounded-md bg-red-700 px-2 py-1 text-xs font-black text-white uppercase"
				>{t('home.soldOut')}</span
			>
		{/if}
	</a>
	<div class="flex flex-1 flex-col p-5">
		<h3 class="text-xl font-bold tracking-tight">
			<a href="/menu/{p.slug}" class="hover:underline">{p.name}</a>
		</h3>
		<p class="mt-1 line-clamp-3 text-sm text-muted">{p.description}</p>
		<div class="mt-auto flex items-center justify-between gap-3 pt-4">
			<p class="text-2xl font-black tabular-nums">
				{#if needsChoice}<span class="text-sm font-semibold text-muted">{t('home.from')}&nbsp;</span
					>{/if}<Money cents={p.priceCents} />
			</p>
			{#if out || !open}
				<span class="btn rounded-full bg-stone-200 px-4 text-sm text-muted"
					>{out ? t('home.soldOut') : t('home.closed')}</span
				>
			{:else if needsChoice}
				<a href="/menu/{p.slug}" class="btn-primary rounded-full px-4 text-sm whitespace-nowrap">
					<Icon name="cart" class="size-4" />
					{t('menu.addShort')}
				</a>
			{:else}
				<button
					class="btn-primary rounded-full px-4 text-sm whitespace-nowrap"
					onclick={() => onadd?.()}
					aria-live="polite"
				>
					{#if added}<Icon name="check" class="size-4" />
						{t('home.added')}{:else}<Icon name="cart" class="size-4" />
						{t('menu.addShort')}{/if}
				</button>
			{/if}
		</div>
	</div>
</li>
