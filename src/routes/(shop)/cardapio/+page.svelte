<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { cart } from '#lib/client/cart.svelte.ts';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import { categoryIcon } from '#lib/domain/category-icon.ts';
	import Money from '#lib/components/atoms/Money.svelte';
	import type { Product } from '#lib/domain/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';
	import CartPanel from '../CartPanel.svelte';

	let { data } = $props();
	const t = useTexts();
	const logo = $derived(data.branding.images.logo);
	const soldOut = $derived(new Set(data.soldOut));
	const missingIngredients = $derived(new Set(data.missingIngredients));
	const sections = $derived(
		data.catalog.categories
			.slice()
			.sort((a, b) => a.position - b.position)
			.map((c) => ({ ...c, products: data.catalog.products.filter((p) => p.categoryId === c.id) }))
			.filter((c) => c.products.length)
	);
	// The home page's category tiles link here as /cardapio?categoria=<slug>.
	let selected = $state<string | null>(
		untrack(
			() =>
				data.catalog.categories.find((c) => c.slug === page.url.searchParams.get('categoria'))
					?.id ?? null
		)
	);
	let query = $state('');
	const shown = $derived.by(() => {
		const q = fold(query.trim());
		return (selected ? sections.filter((s) => s.id === selected) : sections)
			.map((s) => ({
				...s,
				products: q
					? s.products.filter((p) => fold(`${p.name} ${p.description}`).includes(q))
					: s.products
			}))
			.filter((s) => s.products.length);
	});
	function fold(text: string) {
		return text
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.toLowerCase();
	}

	// Products with option groups go to their page so the customer can choose;
	// the rest go straight into the cart.
	let justAdded = $state<string | null>(null);
	let addedTimer: ReturnType<typeof setTimeout> | undefined;
	function quickAdd(p: Product) {
		cart.add(p, 1, [], '');
		justAdded = p.sku;
		clearTimeout(addedTimer);
		addedTimer = setTimeout(() => (justAdded = null), 1500);
	}
</script>

<svelte:head>
	<title>{t('menu.pageTitle', { name: data.shopName })}</title>
	<meta name="description" content={t('home.metaDescription')} />
</svelte:head>

<div class="relative overflow-x-clip lg:bg-brand-500">
	<!-- brush strokes behind the docked cart, as in the brand art -->
	<svg
		class="pointer-events-none absolute -right-24 bottom-0 hidden h-[60%] w-[55%] text-black/90 lg:block"
		viewBox="0 0 400 300"
		preserveAspectRatio="none"
		aria-hidden="true"
	>
		<path d="M400 120c-90 40-190 110-260 180h260z" fill="currentColor" />
		<path
			d="M400 40C300 90 200 170 120 300h40C230 200 320 120 400 80z"
			fill="currentColor"
			opacity=".55"
		/>
	</svg>

	<div
		class="relative mx-auto max-w-7xl lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:px-6 lg:py-6"
	>
		<div class="min-w-0">
			<!-- Menu -->
			<section
				id="cardapio"
				class="scroll-mt-20 bg-canvas px-4 pt-6 pb-28 sm:px-6 lg:rounded-3xl lg:pb-8"
			>
				<div class="mb-2 flex flex-wrap items-end justify-between gap-4">
					<h1 class="page-title">{t('menu.title')}</h1>
					<label class="relative w-full sm:w-72">
						<span class="sr-only">{t('menu.search')}</span>
						<input
							type="search"
							class="field rounded-full pl-10"
							placeholder={t('menu.search')}
							bind:value={query}
						/>
						<Icon
							name="search"
							class="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted"
						/>
					</label>
				</div>
				<nav
					class="sticky top-16 z-10 -mx-4 mb-6 flex gap-3 overflow-x-auto bg-canvas px-4 py-3 sm:top-20 sm:-mx-6 sm:px-6"
					aria-label={t('home.categories')}
				>
					<button
						class="pill {selected === null ? 'pill-on' : ''}"
						aria-pressed={selected === null}
						onclick={() => (selected = null)}
						><Icon name="grid" class="size-6" />{t('home.all')}</button
					>
					{#each sections as s (s.id)}
						<button
							class="pill {selected === s.id ? 'pill-on' : ''}"
							aria-pressed={selected === s.id}
							onclick={() => (selected = s.id)}
							><Icon name={categoryIcon(s.name)} class="size-6" />{s.name}</button
						>
					{/each}
				</nav>

				{#if sections.length === 0}
					<p class="py-10 text-center text-muted">
						{t('home.emptyMenu')}
					</p>
				{:else if shown.length === 0}
					<p class="py-10 text-center text-muted">{t('menu.noResults')}</p>
				{/if}

				{#each shown as s (s.id)}
					<section id={s.slug} class="mb-10 scroll-mt-40">
						{#if !selected || query}<h2 class="mb-5 section-label">{s.name}</h2>{/if}
						<ul class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
							{#each s.products as p (p.sku)}
								{@const out = soldOut.has(p.sku)}
								{@const needsChoice =
									p.modifierGroups.length > 0 ||
									p.ingredients.some((i) => i.removable && missingIngredients.has(i.id))}
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
										<p class="mt-auto pt-4 text-2xl font-black tabular-nums">
											{#if needsChoice}<span class="text-sm font-semibold text-muted"
													>{t('home.from')}&nbsp;</span
												>{/if}<Money cents={p.priceCents} />
										</p>
										{#if out || !data.store.open}
											<span class="mt-3 btn w-full rounded-full bg-stone-200 text-sm text-muted"
												>{out ? t('home.soldOut') : t('home.closed')}</span
											>
										{:else if needsChoice}
											<a
												href="/menu/{p.slug}"
												class="mt-3 btn-primary w-full rounded-full px-3 text-sm whitespace-nowrap"
											>
												<Icon name="cart" />
												{t('home.add')}
											</a>
										{:else}
											<button
												class="mt-3 btn-primary w-full rounded-full px-3 text-sm whitespace-nowrap"
												onclick={() => quickAdd(p)}
												aria-live="polite"
											>
												{#if justAdded === p.sku}<Icon name="check" />
													{t('home.added')}{:else}<Icon name="cart" /> {t('home.add')}{/if}
											</button>
										{/if}
									</div>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</section>
		</div>

		<!-- Docked cart (desktop) -->
		<aside class="hidden lg:block">
			<div
				id="seu-pedido"
				tabindex="-1"
				role="region"
				class="sticky top-26 h-[calc(100dvh-8rem)] max-h-[760px] rounded-3xl outline-none focus-visible:ring-4 focus-visible:ring-black"
				aria-label={t('cart.title')}
			>
				<CartPanel products={data.catalog.products} store={data.store} {logo} />
			</div>
		</aside>
	</div>
</div>

<style>
	.pill {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		gap: 0.6rem;
		min-height: 3rem;
		padding: 0 1.4rem;
		border-radius: 9999px;
		background: #ece6da;
		font-weight: 600;
		white-space: nowrap;
		transition: background-color 150ms;
	}
	.pill:hover {
		background: #e2dacb;
	}
	.pill-on,
	.pill-on:hover {
		background: var(--color-brand-500);
		color: #000;
		font-weight: 800;
	}
</style>
