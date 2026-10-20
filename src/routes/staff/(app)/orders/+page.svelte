<script lang="ts">
	import { goto } from '$app/navigation';
	import Age from '#lib/components/Age.svelte';
	import LiveBanner from '#lib/components/LiveBanner.svelte';
	import Money from '#lib/components/Money.svelte';
	import PaymentBadge from '#lib/components/PaymentBadge.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { useLiveOrders } from '#lib/client/live.svelte.ts';
	import { formatTime } from '#lib/domain/time.ts';

	let { data } = $props();
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
		const u = new URLSearchParams(location.search);
		if (value) u.set(key, value);
		else u.delete(key);
		goto(`?${u}`, { replace: true });
	}
	const channelLabel: Record<string, string> = { counter: 'Balcão', web: 'Site', ifood: 'iFood' };
	const fulfillmentLabel: Record<string, string> = { counter: 'Balcão', pickup: 'Retirada', delivery: 'Entrega' };
</script>

<svelte:head><title>Pedidos · Equipe</title></svelte:head>
<LiveBanner {live} />

<main class="space-y-3 p-3">
	<div class="flex flex-wrap items-center gap-2">
		<div class="flex gap-1 overflow-x-auto">
			{#each tabs as [key, label] (key)}
				<button class="btn min-h-9 text-sm {data.status === key ? 'bg-ink text-white' : 'btn-secondary'}" onclick={() => setFilter('status', key)}>{label}</button>
			{/each}
		</div>
		<select class="field max-w-48" value={data.channel} onchange={(e) => setFilter('channel', e.currentTarget.value)} aria-label="Canal">
			{#each channels as [v, l] (v)}<option value={v}>{l}</option>{/each}
		</select>
	</div>

	<div class="card overflow-x-auto">
		<table class="w-full text-sm">
			<thead class="bg-stone-50 text-left text-xs text-muted uppercase">
				<tr>
					<th class="p-3">Nº</th><th class="p-3">Status</th><th class="p-3">Canal</th><th class="p-3">Cliente</th>
					<th class="p-3">Itens</th><th class="p-3">Pagamento</th><th class="p-3 text-right">Total</th>
					<th class="p-3">Prometido</th><th class="p-3">Idade</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line">
				{#each data.orders as o (o.id)}
					<tr class="cursor-pointer hover:bg-stone-50" onclick={() => goto(`/staff/orders/${o.id}`)}>
						<td class="p-3 font-bold"><a href="/staff/orders/{o.id}">#{o.orderNumber}</a></td>
						<td class="p-3"><StatusBadge status={o.status} /></td>
						<td class="p-3">{channelLabel[o.channel]} · {fulfillmentLabel[o.fulfillmentType]}</td>
						<td class="p-3">{o.customerLabel ?? '—'}</td>
						<td class="p-3 text-muted">{o.items.reduce((n, i) => n + i.quantity, 0)} itens</td>
						<td class="p-3"><PaymentBadge status={o.paymentStatus} /></td>
						<td class="p-3 text-right"><Money cents={o.totalCents} /></td>
						<td class="p-3">{formatTime(o.promisedAt)}</td>
						<td class="p-3">
							{#if ['new', 'confirmed', 'preparing', 'ready'].includes(o.status)}
								<Age since={o.createdAt} warnAfter={o.status === 'new' ? 3 : 15} lateAfter={o.status === 'new' ? 6 : 25} />
							{:else}—{/if}
						</td>
					</tr>
				{:else}
					<tr><td colspan="9" class="p-10 text-center text-muted">Nenhum pedido neste filtro.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</main>
