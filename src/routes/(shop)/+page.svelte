<script lang="ts">
	import Icon, { type IconName } from '#lib/components/atoms/Icon.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import { heroMotion } from '#lib/client/hero-motion.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
	const soldOut = $derived(new Set(data.soldOut));
	const categories = $derived(
		data.catalog.categories
			.slice()
			.sort((a, b) => a.position - b.position)
			.map((c) => ({ ...c, products: data.catalog.products.filter((p) => p.categoryId === c.id) }))
			.filter((c) => c.products.length)
	);

	// A "Destaques" or "Mais pedidos" category picks the featured row; without one,
	// the first products with a photo stand in.
	const featured = $derived.by(() => {
		const pick = categories.find((c) => /destaque|mais pedidos|popular/i.test(c.name));
		const pool = pick ? pick.products : categories.flatMap((c) => c.products);
		return pool.filter((p) => p.imageUrl && !soldOut.has(p.sku)).slice(0, 8);
	});
	// Quick menu: three burgers, as in mockup 01 ("Burgers que todo mundo ama").
	const quickMenu = $derived(featured.slice(0, 3));
	const titleLines = $derived(t('home.hero.title').split('\n'));

	const modes = $derived(
		[
			data.store.pickup && { icon: 'bag', label: t('home.mode.pickup') },
			data.store.delivery && { icon: 'truck', label: t('home.mode.delivery') },
			data.store.dineIn && { icon: 'store', label: t('home.mode.dineIn') }
		].filter(Boolean) as { icon: IconName; label: string }[]
	);
</script>

<svelte:head>
	<title>{t('home.pageTitle', { name: data.shopName })}</title>
	<meta name="description" content={t('home.metaDescription')} />
</svelte:head>

<!-- Hero: photo backdrop with the burger in front, as in mockups 01 and 03.
     hero-motion.ts adds the intro and the parallax; without JS it is a still photo. -->
<section class="relative isolate overflow-hidden bg-night text-white" {@attach heroMotion}>
	<img
		data-hero-bg
		src="/hero/banner-1920.webp"
		srcset="/hero/banner-960.webp 960w, /hero/banner-1920.webp 1920w"
		sizes="100vw"
		alt=""
		class="absolute inset-x-0 -top-[10%] -z-10 h-[120%] w-full object-cover"
		fetchpriority="high"
	/>
	<div
		class="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/70 to-night/10 md:bg-gradient-to-r md:from-night md:from-20% md:via-night/60 md:via-45% md:to-transparent md:to-75%"
	></div>

	<div
		class="mx-auto grid min-h-[30rem] max-w-7xl items-center gap-2 px-5 pt-20 pb-8 sm:px-8 md:min-h-[36rem] md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-6 md:pt-12 lg:px-6"
	>
		<div class="max-w-xl">
			<span
				data-hero-in
				class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-sm font-semibold backdrop-blur"
			>
				<span
					class="size-2 rounded-full {data.store.open ? 'bg-green-500' : 'bg-red-500'}"
					aria-hidden="true"
				></span>
				{t(data.store.open ? 'home.hero.open' : 'home.hero.closed', { name: data.shopName })}
			</span>
			<p data-hero-in class="mt-4 text-sm font-bold tracking-[0.18em] text-brand-500 uppercase">
				{t('home.hero.eyebrow')}
			</p>
			<h1
				data-hero-in
				class="mt-2 font-display text-[2.75rem] leading-[0.98] font-black tracking-tight sm:text-6xl lg:text-7xl"
			>
				<span class="block md:hidden">{t('home.hero.phoneTitle')}</span>
				<span class="hidden md:contents">
					{#each titleLines as line, i (i)}
						<span class="block {i === titleLines.length - 1 ? 'text-brand-500' : ''}">{line}</span>
					{/each}
				</span>
			</h1>
			<p data-hero-in class="mt-4 max-w-md text-base text-stone-200 sm:text-lg">
				{t('home.hero.text')}
			</p>
			<div data-hero-in class="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
				<a href="/cardapio" class="btn-primary btn-lg px-7">
					{t('home.hero.cta')}
					<Icon name="arrow" />
				</a>
			</div>
			<ul data-hero-in class="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-200">
				{#each modes as m (m.label)}
					<li class="flex items-center gap-2">
						<Icon name={m.icon} class="size-5 text-brand-500" />{m.label}
					</li>
				{/each}
				{#if data.store.open}
					<li class="flex items-center gap-2">
						<Icon name="clock" class="size-5 text-brand-500" />
						{t('home.hero.prepTime', { minutes: data.store.prepTimeMinutes })}
					</li>
				{/if}
			</ul>
		</div>
	</div>
</section>

<div class="mx-auto max-w-7xl space-y-12 px-4 py-10 pb-32 sm:px-6 md:pb-14">
	{#if categories.length === 0}
		<p class="py-10 text-center text-muted">{t('home.emptyMenu')}</p>
	{/if}

	<!-- Quick menu: three burgers (mockup 01 "Nossos destaques") -->
	{#if quickMenu.length}
		<section aria-labelledby="home-destaques">
			<div class="mb-4 flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class="text-xs font-bold tracking-[0.18em] text-muted uppercase">
						{t('home.featured.eyebrow')}
					</p>
					<h2 id="home-destaques" class="font-display text-2xl sm:text-3xl">
						{t('home.featured.title')}
					</h2>
				</div>
				<a href="/cardapio" class="flex items-center gap-1 text-sm font-semibold hover:underline"
					>{t('home.featured.seeAll')}<Icon name="arrow" class="size-4" /></a
				>
			</div>
			<ul
				class="-mx-4 grid snap-x auto-cols-[70%] grid-flow-col gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:auto-cols-[calc((100%-2rem)/3)] sm:grid-flow-row sm:grid-cols-3 sm:overflow-visible sm:px-0"
			>
				{#each quickMenu as p (p.sku)}
					<li class="snap-start">
						<a
							href="/menu/{p.slug}"
							class="group flex h-full flex-col overflow-hidden rounded-(--radius-card) bg-night text-white shadow-(--shadow-card)"
						>
							<span class="block aspect-[4/3] overflow-hidden">
								<img
									src={p.imageUrl}
									alt=""
									class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
									loading="lazy"
								/>
							</span>
							<span class="flex flex-1 items-end justify-between gap-3 p-4">
								<span class="min-w-0">
									<span class="block truncate font-bold">{p.name}</span>
									<span class="mt-0.5 line-clamp-1 text-sm text-stone-400">{p.description}</span>
									<span class="mt-2 block font-black text-brand-500 tabular-nums"
										><Money cents={p.priceCents} /></span
									>
								</span>
								<span
									class="grid size-10 shrink-0 place-items-center rounded-full bg-brand-500 text-black"
									aria-hidden="true"><Icon name="arrow" /></span
								>
							</span>
						</a>
					</li>
				{/each}
			</ul>
			<div class="mt-8 flex justify-center">
				<a href="/cardapio" class="btn-primary btn-lg px-7">
					{t('home.menuButton')}
					<Icon name="arrow" />
				</a>
			</div>
		</section>
	{/if}
</div>
