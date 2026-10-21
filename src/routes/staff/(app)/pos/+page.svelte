<script lang="ts">
	import { deserialize, enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import Money from '#lib/components/Money.svelte';
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

<div class="grid h-[calc(100dvh-57px)] grid-cols-1 lg:h-dvh lg:grid-cols-[1fr_380px]">
	<section class="flex min-h-0 flex-col">
		<div class="flex gap-2 overflow-x-auto border-b border-line bg-surface p-2">
			<input
				class="field max-w-48"
				type="search"
				placeholder="Buscar"
				bind:value={search}
				aria-label="Buscar produto"
			/>
			<button
				class="btn {category === null ? 'bg-brand-500 font-bold text-black' : 'btn-secondary'}"
				onclick={() => (category = null)}>Tudo</button
			>
			{#each data.catalog.categories as c (c.id)}
				<button
					class="btn whitespace-nowrap {category === c.id
						? 'bg-brand-500 font-bold text-black'
						: 'btn-secondary'}"
					onclick={() => (category = c.id)}>{c.name}</button
				>
			{/each}
		</div>
		<div
			class="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-2 sm:grid-cols-3 xl:grid-cols-4"
		>
			{#each products as p (p.sku)}
				{@const out = soldOut.has(p.sku)}
				<button
					class="flex min-h-28 flex-col items-start justify-between card p-3 text-left active:scale-[0.98] {out
						? 'opacity-50'
						: 'hover:border-brand-500'}"
					disabled={out}
					onclick={() => pick(p)}
				>
					<span class="leading-tight font-bold">{p.name}</span>
					<span class="flex w-full items-end justify-between">
						<Money cents={p.priceCents} class="text-lg font-black tabular-nums" />
						{#if out}<span class="text-xs font-semibold text-bad">Esgotado</span>{/if}
					</span>
				</button>
			{:else}
				<p class="col-span-full p-6 text-center text-muted">Nenhum produto encontrado.</p>
			{/each}
		</div>
	</section>

	<aside class="flex min-h-0 flex-col border-l border-line bg-surface" aria-label="Pedido atual">
		<div class="flex-1 overflow-y-auto p-3">
			<h2 class="mb-3 section-label">Pedido</h2>
			{#if lines.length === 0}
				<p class="py-10 text-center text-muted">Toque em um produto para começar.</p>
			{/if}
			<ul class="space-y-2">
				{#each lines as line (line.key)}
					<li class="rounded-lg border border-line p-2">
						<div class="flex justify-between gap-2">
							<span class="font-semibold">{line.product.name}</span>
							<Money cents={lineUnitCents(line) * line.quantity} />
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
						<div class="mt-1 flex items-center gap-1">
							<button
								class="btn-secondary min-h-9 px-3"
								onclick={() => change(line, -1)}
								aria-label="Remover um">−</button
							>
							<span class="w-8 text-center tabular-nums">{line.quantity}</span>
							<button
								class="btn-secondary min-h-9 px-3"
								onclick={() => change(line, 1)}
								aria-label="Adicionar um">+</button
							>
						</div>
					</li>
				{/each}
			</ul>
		</div>

		<form
			method="POST"
			action="?/create"
			class="space-y-2 border-t border-line p-3"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update({ reset: false });
					busy = false;
				};
			}}
		>
			<input type="hidden" name="payload" value={payload} />
			<div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de pedido">
				<button
					type="button"
					class="btn {fulfillmentType === 'dine_in'
						? 'bg-brand-500 font-bold text-black'
						: 'btn-secondary'}"
					aria-pressed={fulfillmentType === 'dine_in'}
					onclick={() => (fulfillmentType = 'dine_in')}>Comer aqui</button
				>
				<button
					type="button"
					class="btn {fulfillmentType === 'pickup'
						? 'bg-brand-500 font-bold text-black'
						: 'btn-secondary'}"
					aria-pressed={fulfillmentType === 'pickup'}
					onclick={() => (fulfillmentType = 'pickup')}>Para viagem</button
				>
				<button
					type="button"
					class="btn {fulfillmentType === 'ifood'
						? 'bg-brand-500 font-bold text-black'
						: 'btn-secondary'}"
					aria-pressed={fulfillmentType === 'ifood'}
					onclick={() => (fulfillmentType = 'ifood')}>iFood (manual)</button
				>
			</div>
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
			<div>
				<input
					class="field"
					placeholder="Nome"
					maxlength="60"
					bind:value={customerLabel}
					aria-label="Nome"
					aria-describedby="pos-name-hint"
				/>
				<p id="pos-name-hint" class="mt-1 text-xs text-muted">Para chamar quando ficar pronto.</p>
			</div>
			{#if fulfillmentType !== 'ifood'}
				<div class="grid grid-cols-[6rem_1fr] gap-2">
					{#if fulfillmentType === 'dine_in'}
						<input
							class="field"
							placeholder="Mesa (opcional)"
							maxlength="20"
							bind:value={tableLabel}
							aria-label="Mesa (opcional)"
						/>
					{/if}
					<input
						class="field {fulfillmentType === 'dine_in' ? '' : 'col-span-2'}"
						type="tel"
						inputmode="tel"
						autocomplete="off"
						placeholder="Celular do cliente (opcional)"
						maxlength="25"
						bind:value={phone}
						aria-label="Celular do cliente (opcional)"
						aria-describedby="pos-phone-hint"
					/>
				</div>
				<p id="pos-phone-hint" class="text-xs text-muted">Para cupons, selos e aviso de pronto.</p>
			{/if}
			<input
				class="field"
				placeholder="Observação do pedido"
				maxlength="300"
				bind:value={notes}
				aria-label="Observação do pedido"
			/>
			{#if fulfillmentType !== 'ifood'}
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
			{#if canDiscount}
				<input
					class="field"
					inputmode="decimal"
					placeholder="Desconto manual (R$)"
					bind:value={discountText}
					aria-label="Desconto manual em reais"
				/>
			{/if}
			<FormError message={form?.error} />
			<dl class="space-y-1 text-sm">
				<div class="flex justify-between">
					<dt>Subtotal</dt>
					<dd><Money cents={subtotal} /></dd>
				</div>
				{#if discount}<div class="flex justify-between text-ok">
						<dt>
							{!manualDiscount && offer?.name ? `Promoção · ${offer.name}` : 'Desconto'}
						</dt>
						<dd>−<Money cents={discount} /></dd>
					</div>{/if}
				<div class="flex justify-between text-lg font-bold">
					<dt>Total</dt>
					<dd><Money cents={total} /></dd>
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
					}}>Limpar</button
				>
				<button
					class="btn-primary btn-lg flex-1"
					disabled={!lines.length ||
						busy ||
						(!!couponCode &&
							!manualDiscount &&
							fulfillmentType !== 'ifood' &&
							!!offer?.couponBlocks)}
				>
					{busy ? 'Enviando…' : fulfillmentType === 'ifood' ? 'Lançar pedido iFood' : 'Cobrar'}
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
