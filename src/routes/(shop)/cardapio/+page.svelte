<script lang="ts">
	import EmptyState from '#lib/components/molecules/EmptyState.svelte';
	import SearchField from '#lib/components/molecules/SearchField.svelte';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { cart } from '#lib/client/cart.svelte.ts';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import ProductCard from '#lib/components/molecules/ProductCard.svelte';
	import { categoryIcon } from '#lib/domain/category-icon.ts';
	import type { Product } from '#lib/domain/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';

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
	// The filters live in the address (?categoria=<slug>&q=<text>), so a filtered menu can be
	// shared, reloaded and reached with Back. The home page's category tiles link here that way.
	const selected = $derived(
		data.catalog.categories.find((c) => c.slug === page.url.searchParams.get('categoria'))?.id ??
			null
	);
	let query = $state(untrack(() => page.url.searchParams.get('q') ?? ''));
	// The last q written to the address; a different one came from navigation and wins.
	let writtenQ = untrack(() => page.url.searchParams.get('q') ?? '');
	$effect(() => {
		const q = page.url.searchParams.get('q') ?? '';
		if (q !== writtenQ) {
			writtenQ = q;
			query = q;
		}
	});
	let qTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const q = query.trim();
		clearTimeout(qTimer);
		if (q === writtenQ) return;
		qTimer = setTimeout(() => {
			writtenQ = q;
			setParam('q', q || null);
		}, 300);
		return () => clearTimeout(qTimer);
	});
	function setParam(key: string, value: string | null) {
		const url = new URL(page.url.href);
		if (value) url.searchParams.set(key, value);
		else url.searchParams.delete(key);
		if (url.search === page.url.search) return;
		goto(url, { replaceState: true, reset: false });
	}
	function selectCategory(slug: string | null) {
		setParam('categoria', slug);
	}
	function clearSearch() {
		query = '';
		writtenQ = '';
		setParam('q', null);
	}
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
	const resultCount = $derived(shown.reduce((n, s) => n + s.products.length, 0));
	const filtered = $derived(!!selected || !!query.trim());
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

<!-- Black field with cream cards in both themes, as in mockup 02. -->
<div class="night-field overflow-x-clip">
	<div class="relative mx-auto max-w-7xl">
		<div class="min-w-0">
			<!-- Menu -->
			<section
				id="cardapio"
				class="scroll-mt-20 bg-canvas px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:pb-12"
			>
				<div class="mb-4">
					<h1 class="page-title">{t('menu.title')}</h1>
					<p class="text-muted">{t('menu.subtitle')}</p>
				</div>
				<SearchField
					label={t('menu.search')}
					bind:value={query}
					class="mb-4 w-full"
					inputClass="rounded-full"
				/>
				<nav
					class="sticky top-16 z-10 -mx-4 mb-6 flex gap-3 overflow-x-auto bg-canvas px-4 py-3 sm:top-20 sm:-mx-6 sm:px-6"
					aria-label={t('home.categories')}
				>
					<button
						class="pill {selected === null ? 'pill-on' : ''}"
						aria-pressed={selected === null}
						onclick={() => selectCategory(null)}
						><Icon name="grid" class="size-6" />{t('home.all')}</button
					>
					{#each sections as s (s.id)}
						<button
							class="pill {selected === s.id ? 'pill-on' : ''}"
							aria-pressed={selected === s.id}
							onclick={() => selectCategory(s.slug)}
							><Icon
								name={categoryIcon(s.name, data.branding.productIcon)}
								class="size-6"
							/>{s.name}</button
						>
					{/each}
				</nav>

				<!-- Read out when the filters change; shown only while a filter is on. -->
				<p
					class="mb-4 text-sm text-muted {filtered && sections.length ? '' : 'sr-only'}"
					role="status"
					aria-live="polite"
				>
					{#if sections.length}{t(resultCount === 1 ? 'menu.results.one' : 'menu.results.many', {
							count: resultCount
						})}{/if}
				</p>

				{#if sections.length === 0}
					<EmptyState title={t('home.emptyMenu')} />
				{:else if shown.length === 0}
					<EmptyState title={t('menu.noResults')} text={t('menu.noResultsHint')}>
						{#snippet action()}
							<button class="btn-secondary" onclick={clearSearch}>{t('menu.clearSearch')}</button>
						{/snippet}
					</EmptyState>
				{/if}

				{#each shown as s (s.id)}
					<section id={s.slug} class="mb-10 scroll-mt-40">
						{#if !selected || query}<h2 class="mb-5 section-label">{s.name}</h2>{/if}
						<ul class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
							{#each s.products as p (p.sku)}
								<ProductCard
									product={p}
									out={soldOut.has(p.sku)}
									needsChoice={p.modifierGroups.length > 0 ||
										p.ingredients.some((i) => i.removable && missingIngredients.has(i.id))}
									open={data.store.open}
									added={justAdded === p.sku}
									{logo}
									onadd={() => quickAdd(p)}
								/>
							{/each}
						</ul>
					</section>
				{/each}
			</section>
		</div>
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
		background: var(--color-quiet);
		font-weight: 600;
		white-space: nowrap;
		transition: background-color 150ms;
	}
	.pill:hover {
		background: var(--color-line);
	}
	.pill-on,
	.pill-on:hover {
		background: var(--color-brand-500);
		color: #000;
		font-weight: 800;
	}
</style>
