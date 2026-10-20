<script lang="ts">
	import { goto } from '$app/navigation';
	import { cart, type StoredOption } from '#lib/client/cart.svelte.ts';
	import Money from '#lib/components/Money.svelte';
	import { REMOVE_GROUP } from '#lib/domain/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
	const p = $derived(data.product);
	const soldOut = $derived(new Set(data.soldOut));
	let quantity = $state(1);
	let note = $state('');
	let picks = $state<Record<string, Record<string, number>>>({});
	let tried = $state(false);

	const count = (g: string) => Object.values(picks[g] ?? {}).reduce((a, b) => a + b, 0);
	function toggle(groupId: string, sku: string, max: number, groupMax: number) {
		const current = picks[groupId]?.[sku] ?? 0;
		if (groupMax === 1) {
			picks[groupId] = current ? {} : { [sku]: 1 };
			return;
		}
		const g = { ...(picks[groupId] ?? {}) };
		if (current >= max || count(groupId) >= groupMax) delete g[sku];
		else g[sku] = current + 1;
		picks[groupId] = g;
	}
	const missingIngredients = $derived(new Set(data.missingIngredients));
	const removable = $derived(p.ingredients.filter((i) => i.removable));
	let removedPicks = $state<string[]>([]);
	// Ingredients that ran out are always left out.
	const removed = $derived(
		removable
			.filter((i) => removedPicks.includes(i.id) || missingIngredients.has(i.id))
			.map((i) => i.id)
	);
	function toggleRemoved(id: string) {
		removedPicks = removedPicks.includes(id)
			? removedPicks.filter((x) => x !== id)
			: [...removedPicks, id];
	}
	const options = $derived<StoredOption[]>([
		...p.modifierGroups.flatMap((g) =>
			Object.entries(picks[g.id] ?? {}).map(([sku, q]) => {
				const o = g.options.find((x) => x.sku === sku)!;
				return { groupId: g.id, sku, name: o.name, priceCents: o.priceCents, quantity: q };
			})
		),
		...removable
			.filter((i) => removed.includes(i.id))
			.map((i) => ({
				groupId: REMOVE_GROUP,
				sku: i.id,
				name: `Sem ${i.name.toLowerCase()}`,
				priceCents: 0,
				quantity: 1
			}))
	]);
	const missing = $derived(p.modifierGroups.filter((g) => count(g.id) < g.minSelections));
	const unit = $derived(p.priceCents + options.reduce((n, o) => n + o.priceCents * o.quantity, 0));
	const out = $derived(soldOut.has(p.sku));

	function add() {
		tried = true;
		if (missing.length || out) return;
		cart.add(p, quantity, options, note.trim());
		goto('/');
	}
</script>

<svelte:head
	><title>{p.name} · {data.shopName}</title><meta
		name="description"
		content={p.description}
	/></svelte:head
>

<article class="space-y-5 py-4">
	<a href="/" class="text-sm text-muted">{t('product.back')}</a>
	{#if p.imageUrl}<img
			src={p.imageUrl}
			alt={p.name}
			class="aspect-video w-full rounded-2xl object-cover"
		/>{/if}
	<header>
		<h1 class="text-2xl font-black">{p.name}</h1>
		<p class="text-muted">{p.description}</p>
		<p class="mt-1 text-lg font-bold"><Money cents={p.priceCents} /></p>
		{#if p.ingredients.length}<p class="mt-2 text-sm text-muted">
				{p.ingredients.map((i) => i.name).join(', ')}
			</p>{/if}
		{#if p.allergens.length}<p class="mt-1 text-xs text-muted">
				{t('product.contains', { list: p.allergens.join(', ') })}
			</p>{/if}
	</header>

	{#each p.modifierGroups as g (g.id)}
		<fieldset>
			<legend class="mb-2 flex w-full items-center justify-between font-semibold">
				<span>{g.name}</span>
				<span
					class="rounded-full px-2 py-0.5 text-xs {g.minSelections && count(g.id) < g.minSelections
						? tried
							? 'bg-red-100 text-bad'
							: 'bg-stone-100'
						: 'bg-stone-100 text-muted'}"
				>
					{g.minSelections ? t('product.required') : t('product.upTo', { max: g.maxSelections })}
				</span>
			</legend>
			<div class="divide-y divide-line card">
				{#each g.options as o (o.sku)}
					{@const q = picks[g.id]?.[o.sku] ?? 0}
					{@const oOut = soldOut.has(o.sku)}
					<button
						type="button"
						disabled={oOut}
						class="flex min-h-12 w-full items-center justify-between px-3 text-left {oOut
							? 'opacity-50'
							: ''}"
						aria-pressed={q > 0}
						onclick={() => toggle(g.id, o.sku, o.maxQuantity, g.maxSelections)}
					>
						<span class="flex items-center gap-3">
							<span
								class="grid size-6 place-items-center {g.maxSelections === 1
									? 'rounded-full'
									: 'rounded-md'} border-2 {q
									? 'border-brand-500 bg-brand-500 text-black'
									: 'border-stone-300'}">{q > 1 ? q : q ? '✓' : ''}</span
							>
							{o.name}{oOut ? ` ${t('product.optionSoldOut')}` : ''}
						</span>
						{#if o.priceCents}<span class="text-sm">+ <Money cents={o.priceCents} /></span>{/if}
					</button>
				{/each}
			</div>
		</fieldset>
	{/each}

	{#if removable.length}
		<fieldset>
			<legend class="mb-2 flex w-full items-center justify-between font-semibold">
				<span>{t('product.removeTitle')}</span>
				<span class="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-muted">{t('product.optional')}</span>
			</legend>
			<div class="divide-y divide-line card">
				{#each removable as i (i.id)}
					{@const off = removed.includes(i.id)}
					{@const out = missingIngredients.has(i.id)}
					<button
						type="button"
						disabled={out}
						class="flex min-h-12 w-full items-center gap-3 px-3 text-left {out ? 'opacity-60' : ''}"
						aria-pressed={off}
						onclick={() => toggleRemoved(i.id)}
					>
						<span
							class="grid size-6 place-items-center rounded-md border-2 {off
								? 'border-bad bg-bad text-white'
								: 'border-stone-300'}">{off ? '✕' : ''}</span
						>
						<span class={off ? 'line-through' : ''}>{i.name}</span>
						{#if out}<span class="text-xs text-muted">{t('product.ingredientOut')}</span>{/if}
					</button>
				{/each}
			</div>
		</fieldset>
	{/if}

	<div>
		<label class="label" for="note">{t('product.note')}</label>
		<textarea
			id="note"
			class="field"
			rows="2"
			maxlength="200"
			bind:value={note}
			placeholder={t('product.notePlaceholder')}></textarea>
	</div>
	{#if tried && missing.length}<p class="alert-error" role="alert">
			{t('product.missing', { list: missing.map((g) => g.name).join(', ') })}
		</p>{/if}

	<div class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface p-4">
		<div class="mx-auto flex max-w-3xl items-center gap-3">
			<div class="flex items-center rounded-lg border border-line">
				<button
					class="btn-ghost"
					onclick={() => (quantity = Math.max(1, quantity - 1))}
					aria-label={t('product.less')}>−</button
				>
				<span class="w-8 text-center font-semibold" aria-live="polite">{quantity}</span>
				<button
					class="btn-ghost"
					onclick={() => (quantity = Math.min(50, quantity + 1))}
					aria-label={t('product.more')}>+</button
				>
			</div>
			<button class="btn-primary flex-1 text-lg" disabled={out || !data.store.open} onclick={add}>
				{out ? t('product.soldOut') : !data.store.open ? t('product.closed') : t('product.add')} · <Money
					cents={unit * quantity}
				/>
			</button>
		</div>
	</div>
</article>
