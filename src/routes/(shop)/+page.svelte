<script lang="ts">
	import { cart } from '#lib/client/cart.svelte.ts';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import Money from '#lib/components/Money.svelte';
	import type { Product } from '#lib/domain/catalog.ts';
	import CartPanel from './CartPanel.svelte';

	let { data } = $props();
	const soldOut = $derived(new Set(data.soldOut));
	const sections = $derived(
		data.catalog.categories
			.slice()
			.sort((a, b) => a.position - b.position)
			.map((c) => ({ ...c, products: data.catalog.products.filter((p) => p.categoryId === c.id) }))
			.filter((c) => c.products.length)
	);
	let selected = $state<string | null>(null);
	const shown = $derived(selected ? sections.filter((s) => s.id === selected) : sections);
	const hero = $derived(
		sections.flatMap((s) => s.products).find((p) => p.imageUrl && !soldOut.has(p.sku)) ?? null
	);

	const fulfilment = $derived(
		data.store.delivery && data.store.pickup
			? { title: 'Delivery e Retirada', hint: 'No conforto da sua casa ou na loja' }
			: data.store.delivery
				? { title: 'Delivery', hint: 'No conforto da sua casa' }
				: { title: 'Retirada na loja', hint: 'Peça agora e retire quentinho' }
	);

	function iconFor(name: string): IconName {
		const n = name.toLowerCase();
		if (/combo/.test(n)) return 'combo';
		if (/bebida|drink|refri|suco|cerveja/.test(n)) return 'drink';
		if (/acompanh|batata|fritas|porç|petisc/.test(n)) return 'fries';
		if (/sobremesa|doce|shake|sorvete/.test(n)) return 'dessert';
		if (/destaque|mais pedidos|popular/.test(n)) return 'crown';
		return 'burger';
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
	<title>{data.shopName} · Cardápio</title>
	<meta name="description" content="Peça seus burgers online para retirada ou entrega." />
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
			<!-- Hero -->
			<section class="relative overflow-hidden bg-night text-white lg:rounded-t-3xl">
				<div
					class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_45%,rgba(255,188,0,0.28),transparent_60%)]"
				></div>
				<div
					class="relative grid items-center gap-6 px-5 pt-10 pb-8 sm:px-10 md:grid-cols-[1.25fr_1fr]"
				>
					<div>
						<h1
							class="font-display text-[2.6rem] leading-[0.95] text-brand-500 uppercase sm:text-6xl md:text-5xl xl:text-6xl"
						>
							Seu próximo<br />burger favorito.
						</h1>
						<p class="mt-5 max-w-md text-base text-stone-200 sm:text-lg">
							Ingredientes selecionados, carne de verdade e muito sabor. Peça agora e receba no
							conforto da sua casa ou retire na loja.
						</p>
						<div class="mt-7 flex flex-wrap items-center gap-4">
							<a
								href="#cardapio"
								class="btn-primary min-h-12 rounded-full px-8 tracking-wide uppercase"
							>
								Pedir agora <Icon name="arrow" />
							</a>
							{#if data.store.open}
								<span class="flex items-center gap-2 text-sm text-stone-300">
									<Icon name="clock" class="size-4 text-brand-500" /> Pronto em cerca de {data.store
										.prepTimeMinutes} min
								</span>
							{/if}
						</div>
					</div>
					<div class="relative hidden aspect-square md:block">
						{#if hero}
							<img
								src={hero.imageUrl}
								alt={hero.name}
								class="absolute inset-0 size-full rounded-full object-cover shadow-[0_0_80px_rgba(255,188,0,0.25)]"
							/>
						{:else}
							<img
								src="/brand/deku-logo.png"
								alt=""
								class="absolute inset-0 m-auto h-[88%] w-auto drop-shadow-[0_0_50px_rgba(255,188,0,0.35)]"
							/>
						{/if}
					</div>
				</div>
				<!-- Badges -->
				<div class="relative border-t border-night-line bg-black/40">
					<div class="flex flex-wrap gap-x-8 gap-y-4 px-5 py-5 sm:px-10">
						<div class="flex items-center gap-3">
							<Icon name="truck" class="size-8 text-brand-500" strokeWidth={1.75} />
							<div>
								<p class="text-sm font-semibold">{fulfilment.title}</p>
								<p class="text-xs text-stone-400">{fulfilment.hint}</p>
							</div>
						</div>
						{#if data.store.pixKey}
							<div class="flex items-center gap-3 sm:border-l sm:border-stone-700 sm:pl-8">
								<Icon name="pix" class="size-8 text-brand-500" strokeWidth={1.75} />
								<div>
									<p class="text-sm font-semibold">Pague com Pix</p>
									<p class="text-xs text-stone-400">Rápido, seguro e sem complicação</p>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</section>

			<!-- Menu -->
			<section
				id="cardapio"
				class="scroll-mt-20 bg-canvas px-4 pt-6 pb-28 sm:px-6 lg:rounded-b-3xl lg:pb-8"
			>
				<nav
					class="sticky top-16 z-10 -mx-4 mb-6 flex gap-3 overflow-x-auto bg-canvas px-4 py-3 sm:top-20 sm:-mx-6 sm:px-6"
					aria-label="Categorias"
				>
					<button
						class="pill {selected === null ? 'pill-on' : ''}"
						aria-pressed={selected === null}
						onclick={() => (selected = null)}><Icon name="grid" class="size-6" />Todos</button
					>
					{#each sections as s (s.id)}
						<button
							class="pill {selected === s.id ? 'pill-on' : ''}"
							aria-pressed={selected === s.id}
							onclick={() => (selected = s.id)}
							><Icon name={iconFor(s.name)} class="size-6" />{s.name}</button
						>
					{/each}
				</nav>

				{#if sections.length === 0}
					<p class="py-10 text-center text-muted">
						O cardápio ainda está sendo montado. Volte logo!
					</p>
				{/if}

				{#each shown as s (s.id)}
					<section id={s.slug} class="mb-10 scroll-mt-40">
						{#if !selected}<h2 class="mb-4 font-display text-2xl uppercase">{s.name}</h2>{/if}
						<ul class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
							{#each s.products as p (p.sku)}
								{@const out = soldOut.has(p.sku)}
								{@const needsChoice = p.modifierGroups.length > 0}
								<li
									class="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line transition-shadow hover:shadow-lg {out
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
												class="grid size-full place-items-center bg-[radial-gradient(circle_at_50%_60%,rgba(255,188,0,0.22),transparent_65%)]"
											>
												<img src="/brand/deku-mark.png" alt="" class="h-1/2 w-auto opacity-80" />
											</div>
										{/if}
										{#if out}
											<span
												class="absolute top-3 left-3 rounded-md bg-red-700 px-2 py-1 text-xs font-black text-white uppercase"
												>Esgotado</span
											>
										{/if}
									</a>
									<div class="flex flex-1 flex-col p-5">
										<h3 class="text-lg font-bold">
											<a href="/menu/{p.slug}" class="hover:underline">{p.name}</a>
										</h3>
										<p class="mt-1 line-clamp-3 text-sm text-muted">{p.description}</p>
										<p class="mt-auto pt-4 text-2xl font-extrabold">
											{#if needsChoice}<span class="text-sm font-semibold text-muted"
													>a partir de&nbsp;</span
												>{/if}<Money cents={p.priceCents} />
										</p>
										{#if out || !data.store.open}
											<span class="mt-3 btn w-full rounded-full bg-stone-200 text-sm text-muted"
												>{out ? 'Esgotado' : 'Loja fechada'}</span
											>
										{:else if needsChoice}
											<a
												href="/menu/{p.slug}"
												class="mt-3 btn-primary w-full rounded-full px-3 text-sm whitespace-nowrap"
											>
												<Icon name="cart" /> Adicionar ao carrinho
											</a>
										{:else}
											<button
												class="mt-3 btn-primary w-full rounded-full px-3 text-sm whitespace-nowrap"
												onclick={() => quickAdd(p)}
												aria-live="polite"
											>
												{#if justAdded === p.sku}<Icon name="check" /> Adicionado!{:else}<Icon
														name="cart"
													/> Adicionar ao carrinho{/if}
											</button>
										{/if}
									</div>
								</li>
							{/each}
						</ul>
					</section>
				{/each}

				<!-- How to order -->
				<section id="como-pedir" class="scroll-mt-24 rounded-2xl bg-night p-6 text-white sm:p-8">
					<h2 class="font-display text-2xl text-brand-500 uppercase">Como pedir</h2>
					<ol class="mt-5 grid gap-5 sm:grid-cols-3">
						{#each [{ icon: 'burger', title: 'Escolha', text: 'Monte seu pedido no cardápio e ajuste os adicionais.' }, { icon: 'truck', title: data.store.delivery ? 'Entrega ou retirada' : 'Retirada', text: data.store.delivery ? 'Informe o CEP para ver a taxa, ou retire na loja.' : 'Passe na loja quando estiver pronto.' }, { icon: 'pin', title: 'Acompanhe', text: 'Você recebe um link para seguir o pedido em tempo real.' }] as step, i (step.title)}
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
			</section>
		</div>

		<!-- Docked cart (desktop) -->
		<aside class="hidden lg:block">
			<div
				id="seu-pedido"
				tabindex="-1"
				role="region"
				class="sticky top-26 h-[calc(100dvh-8rem)] max-h-[760px] rounded-3xl outline-none focus-visible:ring-4 focus-visible:ring-black"
				aria-label="Seu pedido"
			>
				<CartPanel products={data.catalog.products} store={data.store} />
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
