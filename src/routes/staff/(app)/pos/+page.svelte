<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import Money from '#lib/components/Money.svelte';
	import type { Product } from '#lib/domain/catalog.ts';
	import { parseBRL } from '#lib/domain/money.ts';
	import ProductSheet from './ProductSheet.svelte';
	import { lineUnitCents, toPayload, type CartLine } from './cart.svelte.ts';

	let { data, form } = $props();

	const soldOut = $derived(new Set(data.soldOut));
	const canDiscount = $derived(data.staff.role === 'owner' || data.staff.role === 'manager');

	let category = $state<string | null>(null);
	let search = $state('');
	let lines = $state<CartLine[]>([]);
	let sheet = $state<Product | null>(null);
	let fulfillmentType = $state<'counter' | 'pickup' | 'ifood'>('counter');
	let ifoodCode = $state('');
	let customerLabel = $state('');
	let notes = $state('');
	let discountText = $state('');
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
	const discount = $derived(Math.min(parseBRL(discountText) ?? 0, subtotal));
	const total = $derived(subtotal - discount);

	function pick(p: Product) {
		if (soldOut.has(p.sku)) return;
		if (p.modifierGroups.some((g) => g.minSelections > 0) || p.modifierGroups.length) sheet = p;
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
			notes: notes || undefined,
			discountCents: discount,
			idempotencyKey
		})
	);
</script>

<svelte:head><title>Caixa · Equipe</title></svelte:head>

<div class="grid h-[calc(100dvh-57px)] grid-cols-1 lg:grid-cols-[1fr_380px]">
	<section class="flex min-h-0 flex-col">
		<div class="flex gap-2 overflow-x-auto border-b border-line bg-surface p-2">
			<input class="field max-w-48" type="search" placeholder="Buscar" bind:value={search} aria-label="Buscar produto" />
			<button class="btn {category === null ? 'bg-ink text-white' : 'btn-secondary'}" onclick={() => (category = null)}>Tudo</button>
			{#each data.catalog.categories as c (c.id)}
				<button
					class="btn whitespace-nowrap {category === c.id ? 'bg-ink text-white' : 'btn-secondary'}"
					onclick={() => (category = c.id)}>{c.name}</button
				>
			{/each}
		</div>
		<div class="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-2 sm:grid-cols-3 xl:grid-cols-4">
			{#each products as p (p.sku)}
				{@const out = soldOut.has(p.sku)}
				<button
					class="card flex min-h-28 flex-col items-start justify-between p-3 text-left active:scale-[0.98] {out
						? 'opacity-50'
						: 'hover:border-brand-500'}"
					disabled={out}
					onclick={() => pick(p)}
				>
					<span class="font-semibold leading-tight">{p.name}</span>
					<span class="flex w-full items-end justify-between">
						<Money cents={p.priceCents} class="text-lg font-bold" />
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
			<h2 class="mb-2 text-lg font-bold">Pedido</h2>
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
								{line.options.map((o) => (o.quantity > 1 ? `${o.quantity}× ${o.name}` : o.name)).join(', ')}
							</p>
						{/if}
						{#if line.note || line.allergy}
							<p class="text-xs {line.allergy ? 'font-semibold text-bad' : 'text-muted'}">
								{line.allergy ? '⚠ Alergia. ' : ''}{line.note}
							</p>
						{/if}
						<div class="mt-1 flex items-center gap-1">
							<button class="btn-secondary min-h-9 px-3" onclick={() => change(line, -1)} aria-label="Remover um">−</button>
							<span class="w-8 text-center tabular-nums">{line.quantity}</span>
							<button class="btn-secondary min-h-9 px-3" onclick={() => change(line, 1)} aria-label="Adicionar um">+</button>
						</div>
					</li>
				{/each}
			</ul>
		</div>

		<form
			method="POST"
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
				<button type="button" class="btn {fulfillmentType === 'counter' ? 'bg-ink text-white' : 'btn-secondary'}" aria-pressed={fulfillmentType === 'counter'} onclick={() => (fulfillmentType = 'counter')}>Balcão</button>
				<button type="button" class="btn {fulfillmentType === 'pickup' ? 'bg-ink text-white' : 'btn-secondary'}" aria-pressed={fulfillmentType === 'pickup'} onclick={() => (fulfillmentType = 'pickup')}>Para viagem</button>
				<button type="button" class="btn {fulfillmentType === 'ifood' ? 'bg-ink text-white' : 'btn-secondary'}" aria-pressed={fulfillmentType === 'ifood'} onclick={() => (fulfillmentType = 'ifood')}>iFood (manual)</button>
			</div>
			{#if fulfillmentType === 'ifood'}
				<input class="field" placeholder="Código do pedido no iFood" maxlength="20" bind:value={ifoodCode} aria-label="Código do pedido no iFood" required />
				<p class="text-xs text-muted">Já pago no iFood. Confirme e atualize o pedido também no app do iFood.</p>
			{/if}
			<input class="field" placeholder="Nome ou mesa (opcional)" maxlength="60" bind:value={customerLabel} aria-label="Nome ou mesa" />
			<input class="field" placeholder="Observação do pedido" maxlength="300" bind:value={notes} aria-label="Observação do pedido" />
			{#if canDiscount}
				<input class="field" inputmode="decimal" placeholder="Desconto (R$)" bind:value={discountText} aria-label="Desconto em reais" />
			{/if}
			<FormError message={form?.error} />
			<dl class="space-y-1 text-sm">
				<div class="flex justify-between"><dt>Subtotal</dt><dd><Money cents={subtotal} /></dd></div>
				{#if discount}<div class="flex justify-between text-ok"><dt>Desconto</dt><dd>−<Money cents={discount} /></dd></div>{/if}
				<div class="flex justify-between text-lg font-bold"><dt>Total</dt><dd><Money cents={total} /></dd></div>
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
				<button class="btn-primary flex-1 text-lg" disabled={!lines.length || busy}>
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
		onclose={() => (sheet = null)}
		onadd={(l) => sheet && addLine(sheet, l)}
	/>
{/if}
