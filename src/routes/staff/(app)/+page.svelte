<script lang="ts">
	import Age from '#lib/components/Age.svelte';
	import LiveBanner from '#lib/components/LiveBanner.svelte';
	import Money from '#lib/components/Money.svelte';
	import { useLiveOrders } from '#lib/client/live.svelte.ts';

	let { data } = $props();
	const live = useLiveOrders(() => data.live);
	// iFood cancels orders the shop does not confirm in time; warn well before that.
	let now = $state(Date.now());
	$effect(() => {
		const t = setInterval(() => (now = Date.now()), 15_000);
		return () => clearInterval(t);
	});
	const ifoodLate = $derived(
		data.urgent.filter((o) => o.channel === 'ifood' && now - new Date(o.createdAt).getTime() > 5 * 60_000)
	);
	const tiles = $derived([
		{ label: 'Aguardando confirmação', value: data.counts.new, href: '/staff/orders?status=new', alert: data.counts.new > 0 },
		{ label: 'Em produção', value: data.counts.open, href: '/staff/orders?status=open', alert: false },
		{ label: 'Prontos para entregar', value: data.counts.ready, href: '/staff/orders?status=ready', alert: false },
		{ label: 'Pedidos hoje', value: data.counts.today, href: '/staff/orders', alert: false }
	]);
</script>

<svelte:head><title>Início · Equipe</title></svelte:head>
<LiveBanner {live} />

<main class="mx-auto max-w-5xl space-y-6 p-4">
	{#if !data.settings.acceptingOrders}
		<div class="alert-warn flex items-center justify-between gap-3">
			<span><strong>Loja pausada.</strong> {data.settings.pauseReason ?? ''}</span>
			{#if data.staff.role === 'owner' || data.staff.role === 'manager'}
				<a class="btn-secondary min-h-9" href="/staff/settings/store">Abrir loja</a>
			{/if}
		</div>
	{/if}
	{#if data.counts.unpaid > 0}
		<a href="/staff/reconciliation" class="alert-warn block">
			{data.counts.unpaid} pedido(s) das últimas 24 h com pagamento pendente ou desconhecido.
		</a>
	{/if}
	{#if ifoodLate.length}
		<p class="alert-error" role="alert">
			<strong>{ifoodLate.length} pedido(s) do iFood aguardando há mais de 5 min.</strong> Confirme antes de 8 min para o iFood não cancelar.
		</p>
	{/if}
	{#if data.counts.dead > 0}
		<p class="alert-error">{data.counts.dead} evento(s) de integração com falha. Veja a página de integrações.</p>
	{/if}

	<section class="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Resumo do turno">
		{#each tiles as t (t.label)}
			<a href={t.href} class="card p-4 hover:border-brand-500 {t.alert ? 'border-amber-400 bg-amber-50' : ''}">
				<div class="text-3xl font-bold tabular-nums">{t.value}</div>
				<div class="text-sm text-muted">{t.label}</div>
			</a>
		{/each}
	</section>

	<section class="flex flex-wrap gap-3">
		{#if data.staff.role !== 'kitchen'}
			<a class="btn-primary text-lg" href="/staff/pos">Novo pedido no caixa</a>
		{/if}
		<a class="btn-secondary" href="/kitchen">Abrir tela da cozinha</a>
		<a class="btn-secondary" href="/staff/orders">Todos os pedidos</a>
	</section>

	{#if data.urgent.length}
		<section class="space-y-2">
			<h2 class="text-lg font-semibold">Aguardando confirmação</h2>
			<ul class="divide-y divide-line card">
				{#each data.urgent as o (o.id)}
					<li>
						<a href="/staff/orders/{o.id}" class="flex items-center justify-between gap-3 p-3 hover:bg-stone-50">
							<span class="font-semibold">#{o.orderNumber}</span>
							<span class="flex-1 text-sm text-muted">{o.channel === 'ifood' ? `iFood ${o.channelDisplayId ?? ''}` : o.channel} · {o.customerLabel ?? ''}</span>
							<Money cents={o.totalCents} />
							<Age since={o.createdAt} warnAfter={o.channel === 'ifood' ? 4 : 3} lateAfter={6} />
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>
