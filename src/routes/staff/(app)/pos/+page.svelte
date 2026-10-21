<script lang="ts">
	import { deserialize, enhance } from '$app/forms';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import ProductImage from '#lib/components/atoms/ProductImage.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import type { Product } from '#lib/domain/catalog.ts';
	import { parseBRL } from '#lib/domain/money.ts';
	import ProductSheet from './ProductSheet.svelte';
	import { lineUnitCents, toPayload, type CartLine } from './cart.svelte.ts';

	let { data, form } = $props();

	const soldOut = $derived(new Set(data.soldOut));
	const canDiscount = $derived(data.staff.role === 'admin');

	let category = $state<string | null>(null);
	let search = $state('');
	let lines = $state<CartLine[]>([]);
	let sheet = $state<Product | null>(null);
	let fulfillmentType = $state<'dine_in' | 'pickup' | 'ifood'>('dine_in');
	let ifoodCode = $state('');
	let customerLabel = $state('');
	let tableLabel = $state('');
	let phone = $state('');
	let notes = $state('');
	let discountText = $state('');
	let couponInput = $state('');
	let couponCode = $state('');
	let offer = $state<{
		name: string | null;
		discountCents: number;
		couponError: string | null;
		couponBlocks: boolean;
	} | null>(null);
	let busy = $state(false);
	let searchEl = $state<HTMLInputElement>();
	let payEl = $state<HTMLButtonElement>();
	// One key per cart: a double tap or a retry after a timeout cannot create two orders.
	let idempotencyKey = $state(crypto.randomUUID());

	const products = $derived(
		data.catalog.products.filter(
			(p) =>
				(!category || p.categoryId === category) &&
				(!search || p.name.toLowerCase().includes(search.toLowerCase()))
		)
	);
	const subtotal = $derived(lines.reduce((n, l) => n + lineUnitCents(l) * l.quantity, 0));
	const manualDiscount = $derived(Math.min(parseBRL(discountText) ?? 0, subtotal));
	// One discount per order: a manual discount replaces any promotion.
	const discount = $derived(
		manualDiscount || (fulfillmentType === 'ifood' ? 0 : (offer?.discountCents ?? 0))
	);
	const total = $derived(subtotal - discount);

	// Ask the server which promotion applies (automatic ones and the typed code).
	let quoteTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const body = new FormData();
		body.set(
			'payload',
			JSON.stringify({
				lines: toPayload(lines),
				couponCode: couponCode || undefined,
				phone: phone.trim() || undefined
			})
		);
		clearTimeout(quoteTimer);
		if (!lines.length) {
			offer = null;
			return;
		}
		quoteTimer = setTimeout(async () => {
			try {
				const res = await fetch('?/quote', {
					method: 'POST',
					body,
					headers: { 'x-sveltekit-action': 'true' }
				});
				const result = deserialize(await res.text());
				offer = result.type === 'success' ? (result.data as { offer: typeof offer }).offer : null;
			} catch {
				offer = null;
			}
		}, 250);
	});

	const types = [
		{ value: 'dine_in', label: 'Balcão', icon: 'table' },
		{ value: 'pickup', label: 'Para viagem', icon: 'bag' },
		{ value: 'ifood', label: 'iFood (manual)', icon: 'truck' }
	] as const;
	const itemCount = $derived(lines.reduce((n, l) => n + l.quantity, 0));

	// "/" jumps to the search box and F9 opens the payment step, as on the mockup.
	function onKey(e: KeyboardEvent) {
		const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
		if (e.key === '/' && !typing) {
			e.preventDefault();
			searchEl?.focus();
		} else if (e.key === 'F9' && lines.length) {
			e.preventDefault();
			payEl?.click();
		}
	}

	function pick(p: Product) {
		if (soldOut.has(p.sku)) return;
		if (p.modifierGroups.length || p.ingredients.some((i) => i.removable)) sheet = p;
		else addLine(p, { quantity: 1, options: [], note: '', allergy: false });
	}

	function addLine(product: Product, l: Omit<CartLine, 'key' | 'product'>) {
		const same = lines.find(
			(x) =>
				x.product.sku === product.sku &&
				!x.note &&
				!l.note &&
				x.allergy === l.allergy &&
				JSON.stringify(x.options) === JSON.stringify(l.options)
		);
		if (same) same.quantity += l.quantity;
		else lines.push({ key: crypto.randomUUID(), product, ...l });
		sheet = null;
	}

	function change(line: CartLine, delta: number) {
		line.quantity += delta;
		if (line.quantity <= 0) lines = lines.filter((l) => l.key !== line.key);
	}

	const payload = $derived(
		JSON.stringify({
			lines: toPayload(lines),
			fulfillmentType,
			ifoodCode: fulfillmentType === 'ifood' ? ifoodCode : undefined,
			customerLabel: customerLabel || undefined,
			tableLabel: fulfillmentType === 'dine_in' ? tableLabel.trim() || undefined : undefined,
			phone: fulfillmentType === 'ifood' ? undefined : phone.trim() || undefined,
			notes: notes || undefined,
			discountCents: manualDiscount,
			couponCode: couponCode || undefined,
			idempotencyKey
		})
	);
</script>

<svelte:head><title>Caixa · Equipe</title></svelte:head>
<svelte:window onkeydown={onKey} />

<div class="grid h-[calc(100dvh-57px)] grid-cols-1 lg:h-dvh lg:grid-cols-[1fr_380px]">
	<section class="flex min-h-0 flex-col">
		<header class="space-y-3 border-b border-line bg-surface p-4">
			<div>
				<h1 class="page-title">Caixa</h1>
				<p class="text-sm text-muted">Atendimento no balcão, para viagem ou delivery manual.</p>
			</div>
			<div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de pedido">
				{#each types as t (t.value)}
					<button
						type="button"
						role="radio"
						aria-checked={fulfillmentType === t.value}
						class="flex min-h-14 items-center justify-center gap-2 rounded-(--radius-card) border px-3 font-semibold transition-colors {fulfillmentType ===
						t.value
							? 'border-brand-500 bg-brand-500 text-black'
							: 'border-line bg-surface hover:bg-quiet'}"
						onclick={() => (fulfillmentType = t.value)}
					>
						<Icon name={t.icon} class="size-5" />{t.label}
					</button>
				{/each}
			</div>
			<div class="flex items-center gap-3">
				<div class="relative flex-1">
					<Icon
						name="search"
						class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-stone-400"
					/>
					<input
						bind:this={searchEl}
						class="field pl-10"
						type="search"
						placeholder="Buscar produto"
						bind:value={search}
						aria-label="Buscar produto"
					/>
				</div>
				<span class="hidden text-xs text-muted sm:block"
					>Atalho: <kbd class="rounded border border-line px-1.5">/</kbd></span
				>
			</div>
			<div class="flex gap-2 overflow-x-auto pb-1">
				<button class={category === null ? 'chip-active' : 'chip'} onclick={() => (category = null)}
					>Todos</button
				>
				{#each data.catalog.categories as c (c.id)}
					<button
						class={category === c.id ? 'chip-active' : 'chip'}
						onclick={() => (category = c.id)}>{c.name}</button
					>
				{/each}
			</div>
		</header>

		<div
			class="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-3 sm:grid-cols-3 xl:grid-cols-4"
		>
			{#each products as p (p.sku)}
				{@const out = soldOut.has(p.sku)}
				<button
					class="flex flex-col overflow-hidden card text-left transition-colors hover:border-brand-500 disabled:opacity-50 disabled:hover:border-line"
					disabled={out}
					onclick={() => pick(p)}
				>
					<ProductImage src={p.imageUrl} class="aspect-[4/3] w-full" />
					<span class="flex flex-1 flex-col gap-1 p-3">
						<span class="leading-tight font-bold">{p.name}</span>
						<span class="line-clamp-2 text-xs text-muted">{p.description}</span>
						<span class="mt-auto flex items-center justify-between pt-2">
							<Money cents={p.priceCents} class="font-black" />
							{#if out}
								<span class="text-xs font-semibold text-bad">Esgotado</span>
							{:else}
								<span class="grid size-9 place-items-center rounded-full bg-brand-500 text-black">
									<Icon name="plus" class="size-5" strokeWidth={3} />
								</span>
							{/if}
						</span>
					</span>
				</button>
			{:else}
				<p class="col-span-full p-6 text-center text-muted">Nenhum produto encontrado.</p>
			{/each}
		</div>
	</section>

	<aside class="flex min-h-0 flex-col border-l border-line bg-surface" aria-label="Pedido atual">
		<div class="flex-1 space-y-3 overflow-y-auto p-4">
			<div class="flex items-baseline justify-between">
				<h2 class="font-display text-2xl font-extrabold">Pedido atual</h2>
				<span class="text-sm text-muted">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
			</div>
			{#if lines.length === 0}
				<p class="py-10 text-center text-muted">Toque em um produto para começar.</p>
			{/if}
			<ul class="space-y-3">
				{#each lines as line (line.key)}
					<li class="flex gap-3 rounded-(--radius-control) border border-line p-2">
						<ProductImage src={line.product.imageUrl} class="size-16 shrink-0 rounded-lg" />
						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-2">
								<span class="leading-tight font-semibold">{line.product.name}</span>
								<button
									class="-mt-1 -mr-2 btn-ghost min-h-9 px-2 text-stone-500"
									aria-label="Remover {line.product.name}"
									onclick={() => (lines = lines.filter((l) => l.key !== line.key))}
								>
									<Icon name="close" class="size-4" />
								</button>
							</div>
							{#if line.options.length}
								<p class="text-xs text-muted">
									{line.options
										.map((o) => (o.quantity > 1 ? `${o.quantity}× ${o.name}` : o.name))
										.join(', ')}
								</p>
							{/if}
							{#if line.note || line.allergy}
								<p class="text-xs {line.allergy ? 'font-semibold text-bad' : 'text-muted'}">
									{line.allergy ? '⚠ Alergia. ' : ''}{line.note}
								</p>
							{/if}
							<div class="mt-2 flex items-center justify-between gap-2">
								<div class="flex items-center gap-1">
									<button
										class="grid size-9 place-items-center rounded-full bg-brand-500 font-black text-black"
										onclick={() => change(line, -1)}
										aria-label="Remover um">−</button
									>
									<span class="w-7 text-center font-bold tabular-nums">{line.quantity}</span>
									<button
										class="grid size-9 place-items-center rounded-full bg-brand-500 font-black text-black"
										onclick={() => change(line, 1)}
										aria-label="Adicionar um">+</button
									>
								</div>
								<span class="text-right">
									<Money cents={lineUnitCents(line)} class="block text-xs text-muted" />
									<Money cents={lineUnitCents(line) * line.quantity} class="font-bold" />
								</span>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</div>

		<form
			method="POST"
			action="?/create"
			class="space-y-2 border-t border-line p-4"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update({ reset: false });
					busy = false;
				};
			}}
		>
			<input type="hidden" name="payload" value={payload} />
			{#if fulfillmentType === 'ifood'}
				<input
					class="field"
					placeholder="Código do pedido no iFood"
					maxlength="20"
					bind:value={ifoodCode}
					aria-label="Código do pedido no iFood"
					required
				/>
				<p class="text-xs text-muted">
					Já pago no iFood. Confirme e atualize o pedido também no app do iFood.
				</p>
			{/if}
			<input
				class="field"
				placeholder="Nome ou mesa (opcional)"
				maxlength="60"
				bind:value={customerLabel}
				aria-label="Nome"
			/>
			<p class="text-xs text-muted">Para chamar quando ficar pronto.</p>

			<details class="rounded-(--radius-control) border border-line p-3">
				<summary class="cursor-pointer text-sm font-semibold">Mais opções</summary>
				<div class="mt-3 space-y-2">
					{#if fulfillmentType === 'dine_in'}
						<input
							class="field"
							placeholder="Mesa (opcional)"
							maxlength="20"
							bind:value={tableLabel}
							aria-label="Mesa (opcional)"
						/>
					{/if}
					{#if fulfillmentType !== 'ifood'}
						<input
							class="field"
							type="tel"
							inputmode="tel"
							autocomplete="off"
							placeholder="Celular do cliente (opcional)"
							maxlength="25"
							bind:value={phone}
							aria-label="Celular do cliente (opcional)"
						/>
						<div class="flex gap-2">
							<input
								class="field uppercase"
								placeholder="Cupom"
								maxlength="24"
								autocomplete="off"
								bind:value={couponInput}
								readonly={!!couponCode}
								aria-label="Cupom"
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										couponCode = couponInput.trim();
									}
								}}
							/>
							{#if couponCode}
								<button
									type="button"
									class="btn-secondary"
									onclick={() => {
										couponCode = '';
										couponInput = '';
									}}>Remover</button
								>
							{:else}
								<button
									type="button"
									class="btn-secondary"
									disabled={!couponInput.trim()}
									onclick={() => (couponCode = couponInput.trim())}>Aplicar</button
								>
							{/if}
						</div>
						{#if couponCode && offer?.couponError}
							<p class="text-sm {offer.couponBlocks ? 'text-bad' : 'text-muted'}" role="status">
								{offer.couponError}
							</p>
						{/if}
					{/if}
					<input
						class="field"
						placeholder="Observação do pedido"
						maxlength="300"
						bind:value={notes}
						aria-label="Observação do pedido"
					/>
					{#if canDiscount}
						<input
							class="field"
							inputmode="decimal"
							placeholder="Desconto autorizado (R$)"
							bind:value={discountText}
							aria-label="Desconto manual em reais"
						/>
					{/if}
				</div>
			</details>

			<FormError message={form?.error} />
			<dl class="space-y-1 text-sm">
				<div class="flex justify-between">
					<dt>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'itens'})</dt>
					<dd><Money cents={subtotal} /></dd>
				</div>
				{#if discount}<div class="flex justify-between text-ok">
						<dt>
							{!manualDiscount && offer?.name
								? `Promoção · ${offer.name}`
								: 'Desconto (autorizado)'}
						</dt>
						<dd>−<Money cents={discount} /></dd>
					</div>{/if}
				<div class="flex items-baseline justify-between pt-1 text-xl font-bold">
					<dt>Total</dt>
					<dd><Money cents={total} class="font-display text-3xl font-black" /></dd>
				</div>
			</dl>
			<div class="flex gap-2">
				<button
					type="button"
					class="btn-secondary"
					disabled={!lines.length || busy}
					onclick={() => {
						lines = [];
						idempotencyKey = crypto.randomUUID();
					}}
				>
					<Icon name="trash" class="size-5" />Limpar
				</button>
				<button
					bind:this={payEl}
					class="btn-primary btn-lg flex-1"
					disabled={!lines.length ||
						busy ||
						(!!couponCode &&
							!manualDiscount &&
							fulfillmentType !== 'ifood' &&
							!!offer?.couponBlocks)}
				>
					<Icon name={fulfillmentType === 'ifood' ? 'truck' : 'card'} class="size-5" />
					{busy ? 'Enviando…' : fulfillmentType === 'ifood' ? 'Lançar pedido iFood' : 'Cobrar'}
					<kbd
						class="ml-1 hidden rounded border border-black/30 px-1 text-xs font-semibold sm:inline"
						>F9</kbd
					>
				</button>
			</div>
		</form>
	</aside>
</div>

{#if sheet}
	<ProductSheet
		product={sheet}
		{soldOut}
		missingIngredients={new Set(data.missingIngredients)}
		onclose={() => (sheet = null)}
		onadd={(l) => sheet && addLine(sheet, l)}
	/>
{/if}
