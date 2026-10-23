<script lang="ts">
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	// Modifier picker. Enforces min/max per group before the item can be added.
	import { useTexts } from '#lib/texts/context.ts';
	import Money from '#lib/components/atoms/Money.svelte';
	import { REMOVE_GROUP, type Product } from '#lib/domain/catalog.ts';
	import { lineUnitCents, type CartOption } from './cart.svelte.ts';

	let {
		product,
		soldOut,
		missingIngredients,
		onadd,
		onclose
	}: {
		product: Product;
		soldOut: Set<string>;
		missingIngredients: Set<string>;
		onadd: (line: {
			quantity: number;
			options: CartOption[];
			note: string;
			allergy: boolean;
		}) => void;
		onclose: () => void;
	} = $props();

	const t = useTexts();
	let quantity = $state(1);
	let note = $state('');
	let allergy = $state(false);
	let picks = $state<Record<string, Record<string, number>>>({});

	const count = (groupId: string) => Object.values(picks[groupId] ?? {}).reduce((a, b) => a + b, 0);

	function toggle(groupId: string, sku: string, max: number, groupMax: number) {
		const group = { ...(picks[groupId] ?? {}) };
		const current = group[sku] ?? 0;
		if (groupMax === 1) {
			picks[groupId] = current ? {} : { [sku]: 1 };
			return;
		}
		if (current >= max || count(groupId) >= groupMax) delete group[sku];
		else group[sku] = current + 1;
		picks[groupId] = group;
	}

	const removable = $derived(product.ingredients.filter((i) => i.removable));
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

	const options = $derived<CartOption[]>([
		...product.modifierGroups.flatMap((g) =>
			Object.entries(picks[g.id] ?? {}).map(([sku, qty]) => {
				const o = g.options.find((x) => x.sku === sku)!;
				return { groupId: g.id, sku, name: o.name, priceCents: o.priceCents, quantity: qty };
			})
		),
		...removable
			.filter((i) => removed.includes(i.id))
			.map((i) => ({
				groupId: REMOVE_GROUP,
				sku: i.id,
				// Stored on the order as is; the kitchen ticket and card bold lines that start with "Sem ".
				name: `Sem ${i.name.toLowerCase()}`,
				priceCents: 0,
				quantity: 1
			}))
	]);
	const missing = $derived(product.modifierGroups.filter((g) => count(g.id) < g.minSelections));
	const unit = $derived(lineUnitCents({ product, options }));
</script>

<div
	class="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center"
	role="presentation"
	onclick={onclose}
>
	<div
		class="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-5 md:rounded-2xl"
		role="dialog"
		aria-modal="true"
		aria-labelledby="sheet-title"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.key === 'Escape' && onclose()}
	>
		<div class="mb-4 flex items-start justify-between gap-3">
			<div>
				<h2 id="sheet-title" class="text-xl font-bold">{product.name}</h2>
				<p class="text-sm text-muted">{product.description}</p>
			</div>
			<button class="btn-ghost min-h-9" onclick={onclose} aria-label={t('pos.close')}>✕</button>
		</div>

		{#each product.modifierGroups as g (g.id)}
			<fieldset class="mb-4">
				<legend class="mb-2 flex w-full justify-between font-semibold">
					<span>{g.name}</span>
					<span
						class="text-xs font-normal {count(g.id) < g.minSelections ? 'text-bad' : 'text-muted'}"
					>
						{g.minSelections > 0 ? `${t('pos.required')} ` : ''}{count(g.id)}/{g.maxSelections}
					</span>
				</legend>
				<div class="grid grid-cols-2 gap-2">
					{#each g.options as o (o.sku)}
						{@const qty = picks[g.id]?.[o.sku] ?? 0}
						{@const out = soldOut.has(o.sku)}
						<button
							type="button"
							disabled={out}
							class="flex min-h-12 items-center justify-between rounded-lg border px-3 text-left text-sm {qty
								? 'border-brand-600 bg-brand-50 font-semibold'
								: 'border-line'}"
							aria-pressed={qty > 0}
							onclick={() => toggle(g.id, o.sku, o.maxQuantity, g.maxSelections)}
						>
							<span
								>{qty > 1 ? `${qty}× ` : ''}{o.name}{out ? ` ${t('pos.optionSoldOut')}` : ''}</span
							>
							{#if o.priceCents}<span class="text-xs">+<Money cents={o.priceCents} /></span>{/if}
						</button>
					{/each}
				</div>
			</fieldset>
		{/each}

		{#if removable.length}
			<fieldset class="mb-4">
				<legend class="mb-2 font-semibold">{t('pos.removeTitle')}</legend>
				<div class="grid grid-cols-2 gap-2">
					{#each removable as i (i.id)}
						{@const off = removed.includes(i.id)}
						{@const out = missingIngredients.has(i.id)}
						<button
							type="button"
							disabled={out}
							class="flex min-h-12 items-center rounded-lg border px-3 text-left text-sm {off
								? 'border-bad bg-bad-tint font-semibold text-bad'
								: 'border-line'}"
							aria-pressed={off}
							onclick={() => toggleRemoved(i.id)}
						>
							{off ? `Sem ${i.name.toLowerCase()}` : i.name}{out ? ` ${t('pos.missing')}` : ''}
						</button>
					{/each}
				</div>
			</fieldset>
		{/if}

		<label class="label" for="note">{t('pos.lineNote')}</label>
		<input
			id="note"
			class="mb-2 field"
			maxlength={200}
			bind:value={note}
			placeholder={t('pos.lineNotePlaceholder')}
		/>
		<Checkbox label={t('pos.allergy')} bind:checked={allergy} class="mb-4 text-sm" />

		<div class="flex items-center gap-3">
			<div class="flex items-center rounded-lg border border-line">
				<button
					class="btn-ghost"
					onclick={() => (quantity = Math.max(1, quantity - 1))}
					aria-label={t('pos.decrease')}>−</button
				>
				<span class="w-8 text-center font-semibold tabular-nums" aria-live="polite">{quantity}</span
				>
				<button
					class="btn-ghost"
					onclick={() => (quantity = Math.min(50, quantity + 1))}
					aria-label={t('pos.increase')}>+</button
				>
			</div>
			<button
				class="btn-primary flex-1"
				disabled={missing.length > 0}
				onclick={() => onadd({ quantity, options, note: note.trim(), allergy })}
			>
				{missing.length ? t('pos.choose', { name: missing[0].name }) : t('pos.add')} · <Money
					cents={unit * quantity}
				/>
			</button>
		</div>
	</div>
</div>
