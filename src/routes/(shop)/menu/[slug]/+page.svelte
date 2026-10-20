<script lang="ts">
	import { goto } from '$app/navigation';
	import { cart, type StoredOption } from '#lib/client/cart.svelte.ts';
	import Money from '#lib/components/Money.svelte';

	let { data } = $props();
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
	const options = $derived<StoredOption[]>(
		p.modifierGroups.flatMap((g) =>
			Object.entries(picks[g.id] ?? {}).map(([sku, q]) => {
				const o = g.options.find((x) => x.sku === sku)!;
				return { groupId: g.id, sku, name: o.name, priceCents: o.priceCents, quantity: q };
			})
		)
	);
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
	<a href="/" class="text-sm text-muted">← Cardápio</a>
	{#if p.imageUrl}<img
			src={p.imageUrl}
			alt={p.name}
			class="aspect-video w-full rounded-2xl object-cover"
		/>{/if}
	<header>
		<h1 class="text-2xl font-black">{p.name}</h1>
		<p class="text-muted">{p.description}</p>
		<p class="mt-1 text-lg font-bold"><Money cents={p.priceCents} /></p>
		{#if p.allergens.length}<p class="mt-1 text-xs text-muted">
				Contém: {p.allergens.join(', ')}
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
					{g.minSelections ? 'Obrigatório' : `Até ${g.maxSelections}`}
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
									? 'border-brand-600 bg-brand-600 text-white'
									: 'border-stone-300'}">{q > 1 ? q : q ? '✓' : ''}</span
							>
							{o.name}{oOut ? ' (esgotado)' : ''}
						</span>
						{#if o.priceCents}<span class="text-sm">+ <Money cents={o.priceCents} /></span>{/if}
					</button>
				{/each}
			</div>
		</fieldset>
	{/each}

	<div>
		<label class="label" for="note">Alguma observação?</label>
		<textarea
			id="note"
			class="field"
			rows="2"
			maxlength="200"
			bind:value={note}
			placeholder="Ex.: sem sal na batata"></textarea>
	</div>
	{#if tried && missing.length}<p class="alert-error" role="alert">
			Escolha: {missing.map((g) => g.name).join(', ')}.
		</p>{/if}

	<div class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface p-4">
		<div class="mx-auto flex max-w-3xl items-center gap-3">
			<div class="flex items-center rounded-lg border border-line">
				<button
					class="btn-ghost"
					onclick={() => (quantity = Math.max(1, quantity - 1))}
					aria-label="Diminuir">−</button
				>
				<span class="w-8 text-center font-semibold" aria-live="polite">{quantity}</span>
				<button
					class="btn-ghost"
					onclick={() => (quantity = Math.min(50, quantity + 1))}
					aria-label="Aumentar">+</button
				>
			</div>
			<button class="btn-primary flex-1 text-lg" disabled={out || !data.store.open} onclick={add}>
				{out ? 'Esgotado' : !data.store.open ? 'Loja fechada' : 'Adicionar'} · <Money
					cents={unit * quantity}
				/>
			</button>
		</div>
	</div>
</article>
