<script lang="ts">
	import SearchField from '#lib/components/molecules/SearchField.svelte';
	import { fulfillmentLabel } from '#lib/domain/fulfillment.ts';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Age from '#lib/components/atoms/Age.svelte';
	import type { IconName } from '#lib/components/atoms/Icon.svelte';
	import LiveBanner from '#lib/components/organisms/LiveBanner.svelte';
	import OrderLane from '#lib/components/organisms/OrderLane.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import PaymentBadge from '#lib/components/atoms/PaymentBadge.svelte';
	import StatusBadge from '#lib/components/atoms/StatusBadge.svelte';
	import SegmentedTabs from '#lib/components/molecules/SegmentedTabs.svelte';
	import { useLiveOrders } from '#lib/client/live.svelte.ts';
	import PickupCode from '#lib/components/atoms/PickupCode.svelte';
	import { mayCall, pickupCode } from '#lib/domain/pickup.ts';
	import { formatTime } from '#lib/domain/time.ts';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import type { TextKey } from '#lib/texts/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';

	import { SvelteURLSearchParams } from 'svelte/reactivity';

	let { data, form } = $props();
	const t = useTexts();
	const live = useLiveOrders(() => data.live);

	const tabDefs: { key: string; label: TextKey; icon: IconName }[] = [
		{ key: 'active', label: 'orders.tab.active', icon: 'flame' },
		{ key: 'new', label: 'orders.tab.new', icon: 'bag' },
		{ key: 'open', label: 'orders.tab.open', icon: 'chef' },
		{ key: 'ready', label: 'orders.tab.ready', icon: 'check' },
		{ key: 'done', label: 'orders.tab.done', icon: 'receipt' },
		{ key: 'cancelled', label: 'orders.tab.cancelled', icon: 'close' },
		{ key: 'all', label: 'orders.tab.all', icon: 'book' }
	];
	const tabs = $derived(
		tabDefs.map((tab) => ({
			...tab,
			label: t(tab.label),
			count: data.tabCounts[tab.key] ?? 0,
			href: `?${linkParams({ status: tab.key })}`
		}))
	);

	const channels = $derived([
		['', t('orders.channel.all')],
		['counter', t('orders.channel.counter')],
		['web', t('orders.channel.web')],
		['ifood', t('orders.channel.ifood')]
	]);
	const channelLabel = $derived<Record<string, string>>({
		counter: t('orders.channel.counter'),
		web: t('orders.channel.web'),
		ifood: t('orders.channel.ifood')
	});

	/** Current filters as a query string, with one key overridden. */
	function linkParams(over: Record<string, string>) {
		const u = new SvelteURLSearchParams({ status: data.status, channel: data.channel, q: data.q });
		for (const [k, v] of Object.entries(over)) {
			if (v) u.set(k, v);
			else u.delete(k);
		}
		return u;
	}
	function setFilter(key: string, value: string) {
		goto(`?${linkParams({ [key]: value })}`, { replace: true });
	}

	// Board lanes, as in the mockup: novos, em preparo, prontos. Only for the active view.
	const lanes = $derived([
		{
			key: 'new',
			title: t('orders.lane.new'),
			hint: t('orders.lane.newHint'),
			icon: 'bag' as IconName,
			orders: data.orders.filter((o: { status: string }) => ['new', 'confirmed'].includes(o.status))
		},
		{
			key: 'preparing',
			title: t('orders.lane.preparing'),
			hint: t('orders.lane.preparingHint'),
			icon: 'chef' as IconName,
			orders: data.orders.filter((o: { status: string }) => o.status === 'preparing')
		},
		{
			key: 'ready',
			title: t('orders.lane.ready'),
			hint: t('orders.lane.readyHint'),
			icon: 'check' as IconName,
			orders: data.orders.filter((o: { status: string }) => o.status === 'ready')
		}
	]);
	const laneTone: Record<string, string> = {
		new: 'bg-bad-tint',
		preparing: 'bg-brand-tint',
		ready: 'bg-ok-tint'
	};
</script>

<svelte:head><title>{t('orders.tabTitle')}</title></svelte:head>
<LiveBanner {live} />

<main class="space-y-4 p-4 sm:p-6">
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="page-title">{t('orders.title')}</h1>
			<p class="text-sm text-muted">{t('orders.subtitle')}</p>
		</div>
		<span class="text-sm text-muted">{t('orders.updated')}</span>
	</header>

	<div class="flex flex-wrap items-center gap-3">
		<SegmentedTabs {tabs} active={data.status} label={t('orders.filter')} />
		<form method="GET" class="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
			<input type="hidden" name="status" value={data.status} />
			<input type="hidden" name="channel" value={data.channel} />
			<SearchField
				label={t('orders.searchLabel')}
				placeholder={t('orders.searchPlaceholder')}
				name="q"
				value={data.q}
				class="min-w-56 flex-1 sm:max-w-80"
			/>
			<select
				class="field max-w-48"
				value={data.channel}
				onchange={(e) => setFilter('channel', e.currentTarget.value)}
				aria-label={t('orders.channelLabel')}
			>
				{#each channels as [v, l] (v)}<option value={v}>{l}</option>{/each}
			</select>
		</form>
	</div>

	<FormError message={form?.error} />

	{#if data.status === 'active'}
		<div class="grid gap-4 lg:grid-cols-3">
			{#each lanes as lane (lane.key)}
				<OrderLane
					id={lane.key}
					title={lane.title}
					hint={lane.hint}
					icon={lane.icon}
					tone={laneTone[lane.key]}
					count={lane.orders.length}
				>
					{#each lane.orders as o (o.id)}
						<li class="card p-4">
							<a href="/staff/orders/{o.id}" class="block">
								<div class="flex items-start justify-between gap-2">
									<PickupCode number={o.orderNumber} class="font-display text-3xl" />
									<Age
										since={o.createdAt}
										warnAfter={o.status === 'new' ? 3 : 15}
										lateAfter={o.status === 'new' ? 6 : 25}
									/>
								</div>
								<!-- Meta chips: channel, fulfilment and customer, one line each. -->
								<ul class="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
									<li class="chip">{channelLabel[o.channel]}</li>
									<li class="chip">{fulfillmentLabel(o.fulfillmentType, o.tableLabel)}</li>
									{#if o.customerLabel}<li class="chip">{o.customerLabel}</li>{/if}
								</ul>
								<ul class="mt-2 space-y-0.5 text-sm font-medium">
									{#each o.items as item, i (i)}
										<li>{item.quantity}× {item.productName}</li>
									{/each}
								</ul>
								<div class="mt-3 flex items-center justify-between gap-2">
									<PaymentBadge status={o.paymentStatus} />
									<Money cents={o.totalCents} class="font-bold" />
								</div>
							</a>
							{#if o.status === 'confirmed'}
								<form method="POST" action="?/start" use:enhance class="mt-3">
									<input type="hidden" name="orderId" value={o.id} />
									<button class="btn-secondary w-full">{t('orders.startPrep')}</button>
								</form>
							{/if}
							{#if mayCall(o.status)}
								<!-- "Chamar": say the code out loud, then tap; the board and the customer are told. -->
								{#if o.calledAt}<p class="mt-3 text-sm text-muted">
										{t('staff.called', { time: formatTime(o.calledAt) })}
									</p>{/if}
								<form method="POST" action="?/call" use:enhance class="mt-2">
									<input type="hidden" name="orderId" value={o.id} />
									<button
										class="btn-primary w-full"
										aria-label="{t('staff.call')} {pickupCode(o.orderNumber)}{o.customerLabel
											? `, ${o.customerLabel}`
											: ''}">{t('staff.call')}</button
									>
								</form>
							{/if}
						</li>
					{:else}
						<li
							class="rounded-(--radius-card) border border-dashed border-line p-6 text-center text-sm text-muted"
						>
							{t('orders.laneEmpty')}
						</li>
					{/each}
				</OrderLane>
			{/each}
		</div>
	{:else}
		<div class="overflow-hidden overflow-x-auto card">
			<table class="w-full text-sm">
				<thead class="bg-quiet text-left text-xs font-semibold tracking-wide text-muted">
					<tr>
						{#each ['number', 'status', 'channel', 'customer', 'items', 'payment', 'total', 'promised', 'age'] as const as c (c)}
							<th class="p-3 {c === 'total' ? 'text-right' : ''}">{t(`orders.col.${c}`)}</th>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y divide-line">
					{#each data.orders as o (o.id)}
						<tr class="cursor-pointer hover:bg-quiet" onclick={() => goto(`/staff/orders/${o.id}`)}>
							<td class="p-3 font-bold"><a href="/staff/orders/{o.id}">#{o.orderNumber}</a></td>
							<td class="p-3">
								<StatusBadge status={o.status} />
								{#if mayCall(o.status)}
									<!-- "Chamar": say the code out loud, then tap; the board and the customer are told. -->
									<form method="POST" action="?/call" use:enhance class="mt-1">
										<input type="hidden" name="orderId" value={o.id} />
										<button
											onclick={(e) => e.stopPropagation()}
											class="btn-primary min-h-9 text-sm"
											aria-label="{t('staff.call')} {pickupCode(o.orderNumber)}{o.customerLabel
												? `, ${o.customerLabel}`
												: ''}">{t('staff.call')}</button
										>
										{#if o.calledAt}<span class="block text-xs text-muted"
												>{t('staff.called', { time: formatTime(o.calledAt) })}</span
											>{/if}
									</form>
								{/if}
							</td>
							<td class="p-3"
								>{channelLabel[o.channel]} · {fulfillmentLabel(o.fulfillmentType, o.tableLabel)}</td
							>
							<td class="p-3">{o.customerLabel ?? '—'}</td>
							<td class="p-3 text-muted"
								>{t('orders.itemsCount', { n: o.items.reduce((n, i) => n + i.quantity, 0) })}</td
							>
							<td class="p-3"><PaymentBadge status={o.paymentStatus} /></td>
							<td class="p-3 text-right"><Money cents={o.totalCents} /></td>
							<td class="p-3">{formatTime(o.promisedAt)}</td>
							<td class="p-3">
								{#if ['new', 'confirmed', 'preparing', 'ready'].includes(o.status)}
									<Age
										since={o.createdAt}
										warnAfter={o.status === 'new' ? 3 : 15}
										lateAfter={o.status === 'new' ? 6 : 25}
									/>
								{:else}—{/if}
							</td>
						</tr>
					{:else}
						<tr
							><td colspan="9" class="p-10 text-center text-muted">{t('orders.filterEmpty')}</td
							></tr
						>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</main>
