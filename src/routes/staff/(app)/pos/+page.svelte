<script lang="ts">
	import EmptyState from '#lib/components/molecules/EmptyState.svelte';
	import SearchField from '#lib/components/molecules/SearchField.svelte';
	import { deserialize, enhance } from '$app/forms';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import type { Product } from '#lib/domain/catalog.ts';
	import { parseBRL } from '#lib/domain/money.ts';
	import { useTexts } from '#lib/texts/context.ts';
	import POSProductGrid from './POSProductGrid.svelte';
	import POSTicketLines from './POSTicketLines.svelte';
	import ProductSheet from './ProductSheet.svelte';
	import { lineUnitCents, toPayload, type CartLine } from './cart.svelte.ts';

	let { data, form } = $props();
	const t = useTexts();

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
	// On a phone the ticket is a full-screen panel opened from the bottom bar (waiter at the table).
	let ticketOpen = $state(false);
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

	const types = $derived([
		{ value: 'dine_in', label: t('pos.type.dine_in'), icon: 'table' },
		{ value: 'pickup', label: t('pos.type.pickup'), icon: 'bag' },
		{ value: 'ifood', label: t('pos.type.ifood'), icon: 'truck' }
	] as const);
	const itemsLabel = (n: number) => t(n === 1 ? 'pos.item' : 'pos.items');
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

<svelte:head><title>{t('pos.tabTitle')}</title></svelte:head>
<svelte:window onkeydown={onKey} />

<div class="grid h-[calc(100dvh-57px)] grid-cols-1 lg:h-dvh lg:grid-cols-[1fr_380px]">
	<section class="flex min-h-0 flex-col">
		<header class="space-y-3 border-b border-line bg-surface p-4">
			<div>
				<h1 class="page-title">{t('pos.title')}</h1>
				<p class="text-sm text-muted">{t('pos.subtitle')}</p>
			</div>
			<div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('pos.typeLabel')}>
				{#each types as type (type.value)}
					<button
						type="button"
						role="radio"
						aria-checked={fulfillmentType === type.value}
						class="flex min-h-14 items-center justify-center gap-2 rounded-(--radius-card) border px-3 font-semibold transition-colors {fulfillmentType ===
						type.value
							? 'border-brand-500 bg-brand-500 text-black'
							: 'border-line bg-surface hover:bg-quiet'}"
						onclick={() => (fulfillmentType = type.value)}
					>
						<Icon name={type.icon} class="size-5" />{type.label}
					</button>
				{/each}
			</div>
			<div class="flex items-center gap-3">
				<SearchField
					label={t('pos.search')}
					bind:value={search}
					bind:input={searchEl}
					class="flex-1"
				/>
				<span class="hidden text-xs text-muted sm:block"
					>{t('pos.shortcut')} <kbd class="rounded border border-line px-1.5">/</kbd></span
				>
			</div>
			<div class="flex gap-2 overflow-x-auto pb-1">
				<button
					class="chip {category === null ? 'chip-active' : ''}"
					onclick={() => (category = null)}>{t('pos.all')}</button
				>
				{#each data.catalog.categories as c (c.id)}
					<button
						class="chip {category === c.id ? 'chip-active' : ''}"
						onclick={() => (category = c.id)}>{c.name}</button
					>
				{/each}
			</div>
		</header>

		<POSProductGrid {products} {soldOut} onpick={pick} />

		{#if lines.length}
			<button
				type="button"
				class="m-3 btn-primary btn-lg justify-between lg:hidden"
				onclick={() => (ticketOpen = true)}
			>
				<span>{itemCount} {itemsLabel(itemCount)} · {t('pos.viewTicket')}</span>
				<Money cents={total} class="font-black" />
			</button>
		{/if}
	</section>

	<aside
		class="{ticketOpen
			? 'fixed inset-0 z-40 flex'
			: 'hidden'} min-h-0 flex-col border-l border-line bg-surface lg:static lg:z-auto lg:flex"
		aria-label={t('pos.current')}
	>
		<div class="flex-1 space-y-3 overflow-y-auto p-4">
			<button
				type="button"
				class="btn-ghost min-h-9 px-2 lg:hidden"
				onclick={() => (ticketOpen = false)}
			>
				← {t('pos.backToMenu')}
			</button>
			<div class="flex items-baseline justify-between">
				<h2 class="font-display text-2xl font-extrabold">{t('pos.current')}</h2>
				<span class="text-sm text-muted">{itemCount} {itemsLabel(itemCount)}</span>
			</div>
			{#if lines.length === 0}
				<EmptyState title={t('pos.empty')} />
			{/if}
			<POSTicketLines
				{lines}
				onchange={change}
				onremove={(line) => (lines = lines.filter((l) => l.key !== line.key))}
			/>
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
					placeholder={t('pos.ifoodCode')}
					maxlength={20}
					bind:value={ifoodCode}
					aria-label={t('pos.ifoodCode')}
					required
				/>
				<p class="text-xs text-muted">
					Já pago no iFood. Confirme e atualize o pedido também no app do iFood.
				</p>
			{/if}
			{#if fulfillmentType === 'dine_in'}
				<input
					class="field"
					placeholder={t('pos.table')}
					maxlength={20}
					bind:value={tableLabel}
					aria-label={t('pos.table')}
				/>
			{/if}
			<input
				class="field"
				placeholder={t('pos.nameField')}
				maxlength={60}
				bind:value={customerLabel}
				aria-label={t('pos.nameLabel')}
			/>
			<p class="text-xs text-muted">{t('pos.nameHint')}</p>

			<details class="rounded-(--radius-control) border border-line p-3">
				<summary class="cursor-pointer text-sm font-semibold">{t('pos.more')}</summary>
				<div class="mt-3 space-y-2">
					{#if fulfillmentType !== 'ifood'}
						<input
							class="field"
							type="tel"
							inputmode="tel"
							autocomplete="off"
							placeholder={t('pos.phone')}
							maxlength={25}
							bind:value={phone}
							aria-label={t('pos.phone')}
						/>
						<div class="flex gap-2">
							<input
								class="field uppercase"
								placeholder={t('pos.coupon')}
								maxlength={24}
								autocomplete="off"
								bind:value={couponInput}
								readonly={!!couponCode}
								aria-label={t('pos.coupon')}
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
									}}>{t('pos.remove')}</button
								>
							{:else}
								<button
									type="button"
									class="btn-secondary"
									disabled={!couponInput.trim()}
									onclick={() => (couponCode = couponInput.trim())}>{t('pos.apply')}</button
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
						placeholder={t('pos.note')}
						maxlength={300}
						bind:value={notes}
						aria-label={t('pos.note')}
					/>
					{#if canDiscount}
						<input
							class="field"
							inputmode="decimal"
							placeholder={t('pos.manualDiscount')}
							bind:value={discountText}
							aria-label={t('pos.manualDiscountLabel')}
						/>
					{/if}
				</div>
			</details>

			<FormError message={form?.error} />
			<dl class="space-y-1 text-sm">
				<div class="flex justify-between">
					<dt>{t('pos.subtotal', { n: itemCount, unit: itemsLabel(itemCount) })}</dt>
					<dd><Money cents={subtotal} /></dd>
				</div>
				{#if discount}<div class="flex justify-between text-ok">
						<dt>
							{!manualDiscount && offer?.name
								? t('pos.promo', { name: offer.name })
								: t('pos.discountAuth')}
						</dt>
						<dd>−<Money cents={discount} /></dd>
					</div>{/if}
				<div class="flex items-baseline justify-between pt-1 text-xl font-bold">
					<dt>{t('pos.total')}</dt>
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
					<Icon name="trash" class="size-5" />{t('pos.clear')}
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
					{busy
						? t('pos.sending')
						: t(fulfillmentType === 'ifood' ? 'pos.placeIfood' : 'pos.charge')}
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
