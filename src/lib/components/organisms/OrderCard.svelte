<script lang="ts">
	// One ticket on the kitchen board. New and preparing tickets are cream with black text;
	// ready tickets stay dark so the yellow pickup code reads from across the room.
	import { enhance } from '$app/forms';
	import Age from '#lib/components/atoms/Age.svelte';
	import Icon, { type IconName } from '#lib/components/atoms/Icon.svelte';
	import { fulfillmentLabel, type Fulfillment } from '#lib/domain/fulfillment.ts';
	import PickupCode from '#lib/components/atoms/PickupCode.svelte';
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
	const fulfillmentIcon: Record<Fulfillment, IconName> = {
		counter: 'store',
		pickup: 'bag',
		delivery: 'truck',
		dine_in: 'table'
	};
	// Start is the loud yellow button; "ready" is outlined so the two are told apart at a glance.
	const actionTone: Record<Lane, string> = {
		confirmed: 'bg-brand-500 text-black',
		preparing: 'border-2 border-brand-500 bg-brand-100 text-black',
		ready: 'border-2 border-green-500 bg-green-100 text-black'
	};
</script>

<!-- Mockup 07: flat tickets (no shadow), big code and age on top, items, then how the order
	 leaves and when it came in, and one full-width action at the bottom. -->
<article
	class="rounded-lg border-2 p-4 {dark
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
	<header class="mb-3 flex items-start justify-between gap-3">
		<!-- Read across the room on the TV: ready codes are at least 64 px. -->
		<PickupCode
			number={o.orderNumber}
			class="leading-none {dark && !waiting ? 'text-7xl text-yellow-300' : 'text-5xl'}"
		/>
		<p class="flex shrink-0 flex-col items-end leading-tight">
			<span class="text-2xl font-black"
				><Age since={o.acceptedAt ?? o.createdAt} warnAfter={12} lateAfter={20} /></span
			>
			<span class="text-xs {dark ? 'text-stone-400' : 'text-night/60'}">{t('kitchen.since')}</span>
		</p>
	</header>
	{#if o.customerLabel}<p class="mb-1 text-sm {dark ? 'text-stone-300' : 'text-night/60'}">
			{o.customerLabel}
		</p>{/if}
	<ul class="space-y-1.5">
		{#each o.items as item (item.id)}
			<li>
				<p class="text-xl leading-tight font-bold">
					{item.quantity} × {item.productName}
					{#if item.discountCents}<span
							class="ml-1 rounded-sm bg-yellow-300 px-1.5 align-middle text-xs font-black text-black uppercase"
							>{t('kitchen.promo')}</span
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
						⚠ {t('kitchen.allergy')}
					</p>{/if}
				{#if item.note}<p class="pl-4 italic {dark ? 'text-yellow-200' : 'text-yellow-800'}">
						“{item.note}”
					</p>{/if}
			</li>
		{/each}
	</ul>
	{#if o.notes}<p class="mt-2 rounded-sm bg-yellow-200 p-2 text-sm text-night">{o.notes}</p>{/if}
	<div
		class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm {dark
			? 'text-stone-300'
			: 'text-night/80'}"
	>
		<Icon name={fulfillmentIcon[o.fulfillmentType]} class="size-5 shrink-0" />
		<span class="font-medium">{fulfillmentLabel(o.fulfillmentType, o.tableLabel)}</span>
		{#if o.channel !== 'counter'}<span class="text-xs font-bold tracking-wider text-brand-700"
				>{o.channel === 'ifood' ? `IFOOD ${o.channelDisplayId ?? ''}` : 'SITE'}</span
			>{/if}
		<span class="ml-auto tabular-nums">{formatTime(o.createdAt)}</span>
	</div>
	{#if o.promisedAt}<p class="text-right text-xs {dark ? 'text-stone-400' : 'text-night/60'}">
			{t('kitchen.promised', { time: formatTime(o.promisedAt) })}
		</p>{/if}
	<footer class="mt-3 flex gap-2">
		{#if lane === 'confirmed' && !o.kitchenSeenAt}
			<form method="POST" action="?/seen" use:enhance class="flex-1">
				<input type="hidden" name="orderId" value={o.id} />
				<button class="min-h-14 w-full rounded-md bg-night text-lg font-bold text-cream">
					{t('kitchen.seen')}
				</button>
			</form>
		{/if}
		{#if lane === 'ready'}
			<form method="POST" action="?/call" use:enhance class="flex-1">
				<input type="hidden" name="orderId" value={o.id} />
				<button class="min-h-14 w-full rounded-md bg-stone-700 text-xl font-black"
					>{t('staff.call')}</button
				>
			</form>
		{/if}
		{#if nextAction}
			<form method="POST" action="?/move" use:enhance class="flex-[2]">
				<input type="hidden" name="orderId" value={o.id} />
				<input type="hidden" name="to" value={nextAction.to} />
				<button class="min-h-14 w-full rounded-md text-xl font-black {actionTone[lane]}">
					{nextAction.label}
				</button>
			</form>
		{/if}
	</footer>
	{#if lane === 'ready' && o.calledAt}<p class="mt-1 text-sm text-stone-300">
			{t('staff.called', { time: formatTime(o.calledAt) })}
		</p>{/if}
</article>
