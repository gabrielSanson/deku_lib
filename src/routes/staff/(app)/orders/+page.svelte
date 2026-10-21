<script lang="ts">
	import { fulfillmentLabel } from '#lib/domain/fulfillment.ts';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Age from '#lib/components/atoms/Age.svelte';
	import LiveBanner from '#lib/components/organisms/LiveBanner.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import PaymentBadge from '#lib/components/atoms/PaymentBadge.svelte';
	import StatusBadge from '#lib/components/atoms/StatusBadge.svelte';
	import { useLiveOrders } from '#lib/client/live.svelte.ts';
	import { mayCall, pickupCode } from '#lib/domain/pickup.ts';
	import { formatTime } from '#lib/domain/time.ts';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const live = useLiveOrders(() => data.live);

	const tabs = [
		['active', 'Em andamento'],
		['new', 'Novos'],
		['open', 'Em produção'],
		['ready', 'Prontos'],
		['done', 'Concluídos'],
		['cancelled', 'Cancelados'],
		['all', 'Todos']
	];
	const channels = [
		['', 'Todos os canais'],
		['counter', 'Balcão'],
		['web', 'Site'],
		['ifood', 'iFood']
	];
	function setFilter(key: string, value: string) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- short-lived local, not state
		const u = new URLSearchParams(location.search);
		if (value) u.set(key, value);
		else u.delete(key);
		goto(`?${u}`, { replace: true });
	}
	const channelLabel: Record<string, string> = { counter: 'Balcão', web: 'Site', ifood: 'iFood' };

	// Board lanes, as in the mockup: novos, em preparo, prontos. Only for the active view.
	const lanes = $derived([
		{
			key: 'new',
			title: 'Novos',
			hint: 'Aguardando início de preparo',
			orders: data.orders.filter((o: { status: string }) => ['new', 'confirmed'].includes(o.status))
		},
		{
			key: 'preparing',
			title: 'Em preparo',
			hint: 'Pedidos em produção na cozinha',
			orders: data.orders.filter((o: { status: string }) => o.status === 'preparing')
		},
		{
			key: 'ready',
			title: 'Prontos',
			hint: 'Aguardando retirada ou entrega',
			orders: data.orders.filter((o: { status: string }) => o.status === 'ready')
		}
	]);
	const laneTone: Record<string, string> = {
		new: 'bg-bad-tint',
		preparing: 'bg-brand-tint',
		ready: 'bg-ok-tint'
	};
</script>

<svelte:head><title>Pedidos · Equipe</title></svelte:head>
<LiveBanner {live} />

<main class="space-y-4 p-4 sm:p-6">
	<h1 class="page-title">Pedidos</h1>
	<div class="flex flex-wrap items-center gap-2">
		<div class="flex gap-1 overflow-x-auto">
			{#each tabs as [key, label] (key)}
				<button
					class="chip {data.status === key ? 'chip-active' : ''}"
					onclick={() => setFilter('status', key)}>{label}</button
				>
			{/each}
		</div>
		<select
			class="field max-w-48"
			value={data.channel}
			onchange={(e) => setFilter('channel', e.currentTarget.value)}
			aria-label="Canal"
		>
			{#each channels as [v, l] (v)}<option value={v}>{l}</option>{/each}
		</select>
	</div>

	<FormError message={form?.error} />

	{#if data.status === 'active'}
		<div class="grid gap-4 lg:grid-cols-3">
			{#each lanes as lane (lane.key)}
				<section
					class="rounded-(--radius-card) p-3 {laneTone[lane.key]}"
					aria-labelledby="lane-{lane.key}"
				>
					<header class="mb-3 flex items-center justify-between gap-2 px-1">
						<div>
							<h2 id="lane-{lane.key}" class="font-display text-xl font-extrabold">{lane.title}</h2>
							<p class="text-sm text-muted">{lane.hint}</p>
						</div>
						<span class="count">{lane.orders.length}</span>
					</header>
					<ul class="space-y-3">
						{#each lane.orders as o (o.id)}
							<li class="card p-4">
								<a href="/staff/orders/{o.id}" class="block">
									<div class="flex items-start justify-between gap-2">
										<span class="font-display text-3xl font-extrabold tabular-nums"
											>#{o.orderNumber}</span
										>
										<Age
											since={o.createdAt}
											warnAfter={o.status === 'new' ? 3 : 15}
											lateAfter={o.status === 'new' ? 6 : 25}
										/>
									</div>
									<p class="mt-1 text-sm text-muted">
										{channelLabel[o.channel]} · {fulfillmentLabel(
											o.fulfillmentType,
											o.tableLabel
										)}{o.customerLabel ? ` · ${o.customerLabel}` : ''}
									</p>
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
								{#if mayCall(o.status)}
									<!-- "Chamar": say the code out loud, then tap; the board and the customer are told. -->
									<form method="POST" action="?/call" use:enhance class="mt-3">
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
								Nenhum pedido aqui.
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
		<h2 class="section-label pt-2">Lista de pedidos</h2>
	{/if}

	<div class="overflow-hidden overflow-x-auto card">
		<table class="w-full text-sm">
			<thead class="bg-quiet text-left text-xs font-semibold tracking-wide text-muted">
				<tr>
					<th class="p-3">Nº</th><th class="p-3">Status</th><th class="p-3">Canal</th><th
						class="p-3">Cliente</th
					>
					<th class="p-3">Itens</th><th class="p-3">Pagamento</th><th class="p-3 text-right"
						>Total</th
					>
					<th class="p-3">Prometido</th><th class="p-3">Idade</th>
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
						<td class="p-3 text-muted">{o.items.reduce((n, i) => n + i.quantity, 0)} itens</td>
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
						><td colspan="9" class="p-10 text-center text-muted">Nenhum pedido neste filtro.</td
						></tr
					>
				{/each}
			</tbody>
		</table>
	</div>
</main>
