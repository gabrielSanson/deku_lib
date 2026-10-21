<script lang="ts">
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import Money from '#lib/components/Money.svelte';
	import { categoryIcon } from '#lib/domain/category-icon.ts';
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
	const heroPhoto = $derived(featured[0]?.imageUrl ?? null);
	const titleLines = $derived(t('home.hero.title').split('\n'));

	const modes = $derived(
		[
			data.store.pickup && { icon: 'bag', label: t('home.mode.pickup') },
			data.store.delivery && { icon: 'truck', label: t('home.mode.delivery') },
			data.store.dineIn && { icon: 'store', label: t('home.mode.dineIn') }
		].filter(Boolean) as { icon: IconName; label: string }[]
	);

	const howTo = $derived([
		{ icon: 'burger', title: t('home.howTo.1.title'), text: t('home.howTo.1.text') },
		data.store.delivery
			? {
					icon: 'truck',
					title: t('home.howTo.2.delivery.title'),
					text: t('home.howTo.2.delivery.text')
				}
			: {
					icon: 'truck',
					title: t('home.howTo.2.pickup.title'),
					text: t('home.howTo.2.pickup.text')
				},
		{ icon: 'pin', title: t('home.howTo.3.title'), text: t('home.howTo.3.text') }
	]);
</script>

<svelte:head>
	<title>{t('home.pageTitle', { name: data.shopName })}</title>
	<meta name="description" content={t('home.metaDescription')} />
</svelte:head>

<!-- Hero: full-bleed photo on night, as in mockups 01 and 03 -->
<section class="relative isolate overflow-hidden bg-night text-white">
	{#if heroPhoto}
		<img
			src={heroPhoto}
			alt=""
			class="absolute inset-0 -z-10 size-full object-cover md:left-[38%] md:w-[62%]"
			fetchpriority="high"
		/>
		<div
			class="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/60 to-night/10 md:bg-gradient-to-r md:from-night md:from-38% md:via-night/50 md:via-50% md:to-transparent md:to-70%"
		></div>
	{:else}
		<div
			class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_45%,color-mix(in_srgb,var(--color-brand-500)_28%,transparent),transparent_60%)]"
		></div>
		<img
			src={data.branding.images.heroLogo}
			alt=""
			class="absolute top-1/2 right-[6%] -z-10 hidden h-[70%] w-auto -translate-y-1/2 drop-shadow-[0_0_50px_color-mix(in_srgb,var(--color-brand-500)_35%,transparent)] md:block"
		/>
	{/if}

	<div
		class="mx-auto flex min-h-[30rem] max-w-7xl flex-col justify-end px-5 pt-24 pb-8 sm:px-8 md:min-h-[34rem] md:justify-center md:pt-12 lg:px-6"
	>
		<div class="max-w-xl">
			<span
				class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-sm font-semibold backdrop-blur"
			>
				<span
					class="size-2 rounded-full {data.store.open ? 'bg-green-500' : 'bg-red-500'}"
					aria-hidden="true"
				></span>
				{t(data.store.open ? 'home.hero.open' : 'home.hero.closed', { name: data.shopName })}
			</span>
			<h1
				class="mt-4 font-display text-[2.75rem] leading-[0.98] font-black tracking-tight sm:text-6xl lg:text-7xl"
			>
				{#each titleLines as line, i (i)}
					<span class="block {i === titleLines.length - 1 ? 'text-brand-500' : ''}">{line}</span>
				{/each}
			</h1>
			<p class="mt-4 max-w-md text-base text-stone-200 sm:text-lg">{t('home.hero.text')}</p>
			<div class="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
				<a href="/cardapio" class="btn-primary btn-lg px-7">
					{t('home.hero.cta')}
					<Icon name="arrow" />
				</a>
				<a
					href="#como-pedir"
					class="font-semibold text-white underline decoration-brand-500 decoration-2 underline-offset-8 hover:text-brand-400"
					>{t('home.hero.secondary')}</a
				>
			</div>
			<ul class="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-200">
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

	<!-- Categories, as tiles (mockup 03) -->
	{#if categories.length}
		<section aria-labelledby="home-categorias">
			<div class="mb-4 flex items-end justify-between gap-4">
				<h2 id="home-categorias" class="font-display text-2xl sm:text-3xl">
					{t('home.categoriesTitle')}
				</h2>
				<a href="/cardapio" class="flex items-center gap-1 text-sm font-semibold hover:underline"
					>{t('home.seeAll')}<Icon name="arrow" class="size-4" /></a
				>
			</div>
			<ul class="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
				{#each categories as c (c.id)}
					{@const photo = c.products.find((p) => p.imageUrl)?.imageUrl}
					<li class="w-32 shrink-0 snap-start sm:w-40">
						<a
							href="/cardapio?categoria={c.slug}"
							class="group flex flex-col items-center gap-2 card p-3 text-center transition-shadow hover:shadow-lg"
						>
							<span
								class="grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-quiet"
							>
								{#if photo}
									<img
										src={photo}
										alt=""
										class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
										loading="lazy"
									/>
								{:else}
									<Icon name={categoryIcon(c.name)} class="size-10 text-ink" strokeWidth={1.5} />
								{/if}
							</span>
							<span class="text-sm font-bold">{c.name}</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Featured row (mockup 01 "Nossos destaques") -->
	{#if featured.length}
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
				class="-mx-4 grid snap-x auto-cols-[70%] grid-flow-col gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:auto-cols-[40%] sm:px-0 lg:auto-cols-[calc((100%-3rem)/4)]"
			>
				{#each featured as p (p.sku)}
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
									aria-hidden="true"><Icon name="plus" /></span
								>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- How to order -->
	<section id="como-pedir" class="scroll-mt-24 rounded-2xl bg-night p-6 text-white sm:p-8">
		<h2 class="font-display text-2xl text-brand-500">{t('home.howTo.title')}</h2>
		<ol class="mt-5 grid gap-5 sm:grid-cols-3">
			{#each howTo as step, i (i)}
				<li class="flex gap-4">
					<span
						class="grid size-10 shrink-0 place-items-center rounded-full bg-brand-500 font-display text-xl text-black"
						>{i + 1}</span
					>
					<div>
						<p class="flex items-center gap-2 font-bold">
							<Icon name={step.icon as IconName} class="size-5 text-brand-500" />{step.title}
						</p>
						<p class="mt-1 text-sm text-stone-300">{step.text}</p>
					</div>
				</li>
			{/each}
		</ol>
	</section>
</div>
