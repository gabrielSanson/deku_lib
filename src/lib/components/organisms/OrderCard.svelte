<script lang="ts">
	// One ticket on the kitchen board. New and preparing tickets are cream with black text;
	// ready tickets stay dark so the yellow pickup code reads from across the room.
	import { enhance } from '$app/forms';
	import Age from '#lib/components/atoms/Age.svelte';
	import { fulfillmentLabel } from '#lib/domain/fulfillment.ts';
	import { pickupCode } from '#lib/domain/pickup.ts';
	import { formatTime } from '#lib/domain/time.ts';
	import type { OrderSummary } from '#lib/server/orders/queries.ts';
	import { useTexts } from '#lib/texts/context.ts';

	type Lane = 'confirmed' | 'preparing' | 'ready';

	let {
		order: o,
		lane,
		waiting = false,
		called = false,
		fresh = false,
		nextAction
	}: {
		order: OrderSummary;
		lane: Lane;
		/** Ready for more than 10 minutes and not collected. */
		waiting?: boolean;
		/** Staff tapped "Chamar" within the last 15 s. */
		called?: boolean;
		/** New order nobody has marked as seen yet. */
		fresh?: boolean;
		nextAction?: { to: string; label: string };
	} = $props();

	const t = useTexts();
	const dark = $derived(lane === 'ready');
</script>

<article
	class="rounded-xl border-2 p-3 {dark
		? waiting
			? 'on-night border-stone-800 bg-stone-900/60 text-sm text-stone-50'
			: called
				? 'on-night border-4 border-yellow-300 bg-stone-900 text-stone-50 motion-safe:animate-pulse'
				: 'on-night border-stone-700 bg-stone-900 text-stone-50'
		: fresh
			? 'on-cream animate-pulse border-brand-500 bg-cream text-night'
			: 'on-cream border-cream bg-cream text-night'}"
	data-called={called ? '' : undefined}
>
	{#if waiting}<p class="mb-1 text-xs font-bold tracking-wider text-stone-400 uppercase">
			{t('kitchen.waiting')}
		</p>{/if}
	<header class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
		<!-- Read across the room on the TV: ready codes are at least 64 px. -->
		<span
			class="font-black tabular-nums {dark && !waiting ? 'text-7xl text-yellow-300' : 'text-3xl'}"
			>#{pickupCode(o.orderNumber)}</span
		>
		<span class="text-xs font-bold tracking-wider text-brand-700">
			{o.channel === 'ifood'
				? `IFOOD ${o.channelDisplayId ?? ''} · `
				: o.channel === 'web'
					? 'SITE · '
					: ''}{fulfillmentLabel(o.fulfillmentType, o.tableLabel).toUpperCase()}
		</span>
		<span class="text-lg"
			><Age since={o.acceptedAt ?? o.createdAt} warnAfter={12} lateAfter={20} /></span
		>
	</header>
	{#if o.customerLabel}<p class="mb-1 text-sm {dark ? 'text-stone-300' : 'text-night/60'}">
			{o.customerLabel}
		</p>{/if}
	<ul class="space-y-1.5">
		{#each o.items as item (item.id)}
			<li>
				<p class="text-lg leading-tight font-bold">
					{item.quantity}× {item.productName}
					{#if item.discountCents}<span
							class="ml-1 rounded bg-yellow-300 px-1.5 text-xs font-black text-black uppercase"
							>promo</span
						>{/if}
				</p>
				{#each item.modifiers as m, i (i)}
					<p
						class="pl-4 text-base {m.optionName.startsWith('Sem ')
							? `font-semibold ${dark ? 'text-red-300' : 'text-red-700'}`
							: dark
								? 'text-stone-200'
								: 'text-night/80'}"
					>
						{m.quantity > 1 ? `${m.quantity}× ` : ''}{m.optionName}
					</p>
				{/each}
				{#if item.allergyFlag}<p class="pl-4 font-black {dark ? 'text-red-400' : 'text-red-600'}">
						⚠ ALERGIA
					</p>{/if}
				{#if item.note}<p class="pl-4 italic {dark ? 'text-yellow-200' : 'text-yellow-800'}">
						“{item.note}”
					</p>{/if}
			</li>
		{/each}
	</ul>
	{#if o.notes}<p class="mt-2 rounded bg-yellow-200 p-2 text-sm text-night">{o.notes}</p>{/if}
	<footer class="mt-3 flex gap-2">
		{#if lane === 'confirmed' && !o.kitchenSeenAt}
			<form method="POST" action="?/seen" use:enhance class="flex-1">
				<input type="hidden" name="orderId" value={o.id} />
				<button class="min-h-12 w-full rounded-lg bg-night font-bold text-cream">Visto</button>
			</form>
		{/if}
		{#if lane === 'ready'}
			<form method="POST" action="?/call" use:enhance class="flex-1">
				<input type="hidden" name="orderId" value={o.id} />
				<button class="min-h-12 w-full rounded-lg bg-stone-700 text-lg font-black"
					>{t('staff.call')}</button
				>
			</form>
		{/if}
		{#if nextAction}
			<form method="POST" action="?/move" use:enhance class="flex-1">
				<input type="hidden" name="orderId" value={o.id} />
				<input type="hidden" name="to" value={nextAction.to} />
				<button class="min-h-12 w-full rounded-lg bg-brand-500 text-lg font-black text-black">
					{nextAction.label}
				</button>
			</form>
		{/if}
	</footer>
	{#if lane === 'ready' && o.calledAt}<p class="mt-1 text-sm text-stone-300">
			{t('staff.called', { time: formatTime(o.calledAt) })}
		</p>{/if}
	{#if o.promisedAt}<p class="mt-1 text-right text-xs {dark ? 'text-stone-400' : 'text-night/60'}">
			Prometido {formatTime(o.promisedAt)}
		</p>{/if}
</article>
