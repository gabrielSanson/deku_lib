<script lang="ts">
	import Age from '#lib/components/Age.svelte';
	import LiveBanner from '#lib/components/LiveBanner.svelte';
	import Money from '#lib/components/Money.svelte';
	import { useLiveOrders } from '#lib/client/live.svelte.ts';
	import { formatBRL } from '#lib/domain/money.ts';

	let { data } = $props();
	const live = useLiveOrders(() => data.live);
	// iFood cancels orders the shop does not confirm in time; warn well before that.
	let now = $state(Date.now());
	$effect(() => {
		const t = setInterval(() => (now = Date.now()), 15_000);
		return () => clearInterval(t);
	});
	const ifoodLate = $derived(
		data.urgent.filter(
			(o) => o.channel === 'ifood' && now - new Date(o.createdAt).getTime() > 5 * 60_000
		)
	);
	const tiles = $derived([
		{
			label: 'Aguardando confirmação',
			value: data.counts.new,
			href: '/staff/orders?status=new',
			alert: data.counts.new > 0
		},
		{
			label: 'Em produção',
			value: data.counts.open,
			href: '/staff/orders?status=open',
			alert: false
		},
		{
			label: 'Prontos para entregar',
			value: data.counts.ready,
			href: '/staff/orders?status=ready',
			alert: false
		},
		{ label: 'Pedidos hoje', value: data.counts.today, href: '/staff/orders', alert: false }
	]);
	const sales = $derived(data.sales);
	const change = (now: number, before: number) =>
		before > 0 ? Math.round(((now - before) / before) * 100) : null;
	const salesTiles = $derived(
		sales
			? [
					{
						label: 'Vendas líquidas hoje',
						value: formatBRL(sales.now.netCents),
						d: change(sales.now.netCents, sales.before.netCents)
					},
					{
						label: 'Pedidos hoje',
						value: String(sales.now.placed - sales.now.cancelled),
						d: change(
							sales.now.placed - sales.now.cancelled,
							sales.before.placed - sales.before.cancelled
						)
					},
					{
						label: 'Ticket médio',
						value: sales.now.aovCents === null ? '—' : formatBRL(sales.now.aovCents),
						d:
							sales.now.aovCents === null || sales.before.aovCents === null
								? null
								: change(sales.now.aovCents, sales.before.aovCents)
					},
					{
						label: 'Recebido hoje',
						value: formatBRL(sales.now.collectedCents),
						d: change(sales.now.collectedCents, sales.before.collectedCents)
					}
				]
			: []
	);
	const maxDay = $derived(Math.max(1, ...(sales?.week.map((d) => d.grossCents) ?? [])));
	const weekday = (day: string) =>
		new Intl.DateTimeFormat('pt-BR', { weekday: 'narrow', timeZone: 'UTC' }).format(
			new Date(`${day}T00:00:00Z`)
		);
</script>

<svelte:head><title>Início · Equipe</title></svelte:head>
<LiveBanner {live} />

<main class="mx-auto max-w-5xl space-y-7 p-4 sm:p-6">
	<div>
		<h1 class="page-title">Início</h1>
		<p class="mt-1 text-sm text-muted">
			{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(
				new Date(now)
			)}
		</p>
	</div>
	{#if !data.setupDone && data.staff.role === 'admin'}
		<div class="flex flex-wrap items-center justify-between gap-3 alert-warn">
			<span><strong>Falta terminar a configuração da loja.</strong> Leva poucos minutos.</span>
			<a class="btn-primary min-h-9" href="/staff/setup">Continuar configuração</a>
		</div>
	{/if}
	{#each data.ifoodAlerts as alert, i (i)}
		<div class="flex flex-wrap items-center justify-between gap-3 alert-error" role="alert">
			<span><strong>iFood:</strong> {alert}</span>
			{#if data.staff.role === 'admin'}
				<a class="btn-secondary min-h-9" href="/staff/settings/integrations">Ver detalhes</a>
			{/if}
		</div>
	{/each}
	{#if !data.settings.acceptingOrders}
		<div class="flex items-center justify-between gap-3 alert-warn">
			<span><strong>Loja pausada.</strong> {data.settings.pauseReason ?? ''}</span>
			{#if data.staff.role === 'admin'}
				<a class="btn-secondary min-h-9" href="/staff/settings/store">Abrir loja</a>
			{/if}
		</div>
	{/if}
	{#if data.counts.unpaid > 0}
		<a href="/staff/reconciliation" class="block alert-warn">
			{data.counts.unpaid} pedido(s) das últimas 24 h com pagamento pendente ou desconhecido.
		</a>
	{/if}
	{#if ifoodLate.length}
		<p class="alert-error" role="alert">
			<strong>{ifoodLate.length} pedido(s) do iFood aguardando há mais de 5 min.</strong> Confirme antes
			de 8 min para o iFood não cancelar.
		</p>
	{/if}
	{#if data.counts.dead > 0}
		<p class="alert-error">
			{data.counts.dead} evento(s) de integração com falha. Veja a página de integrações.
		</p>
	{/if}

	<section class="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Resumo do turno">
		{#each tiles as t (t.label)}
			<a
				href={t.href}
				class="card p-5 transition-colors hover:border-brand-500 {t.alert
					? 'border-bad bg-bad-tint'
					: ''}"
			>
				<div class="text-sm font-semibold text-muted">{t.label}</div>
				<div class="font-display text-5xl font-black tabular-nums">{t.value}</div>
			</a>
		{/each}
	</section>

	{#if sales}
		<section class="space-y-3" aria-labelledby="sales-today">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h2 id="sales-today" class="section-label">Vendas de hoje</h2>
				<a
					class="text-sm font-semibold text-ink underline decoration-brand-500 decoration-2 underline-offset-4"
					href="/staff/analytics">Ver relatórios</a
				>
			</div>
			<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
				{#each salesTiles as t (t.label)}
					<div class="card p-5">
						<div class="text-sm font-medium text-muted">{t.label}</div>
						<div class="font-display text-4xl font-black tabular-nums">{t.value}</div>
						{#if t.d !== null}
							<div class="text-xs {t.d >= 0 ? 'text-ok' : 'text-bad'}">
								{t.d >= 0 ? '+' : ''}{t.d}% vs. mesmo dia da semana passada
							</div>
						{:else}
							<div class="text-xs text-muted">Sem comparação com a semana passada</div>
						{/if}
					</div>
				{/each}
			</div>
			<div class="grid gap-3 lg:grid-cols-[3fr_2fr]">
				<div class="card p-5">
					<h3 class="mb-4 text-sm font-semibold">Vendas brutas, últimos 14 dias</h3>
					<ol class="flex h-32 items-end gap-1">
						{#each sales.week as d (d.day)}
							<li
								class="flex flex-1 flex-col items-center gap-1"
								title="{d.day}: {formatBRL(d.grossCents)}, {d.orders} pedido(s)"
							>
								<div
									class="w-full rounded-t {d.day === sales.today ? 'bg-brand-500' : 'bg-stone-300'}"
									style="height: {Math.max(2, (d.grossCents / maxDay) * 100)}px"
								></div>
								<span class="text-[10px] text-muted uppercase">{weekday(d.day)}</span>
								<span class="sr-only">{d.day}: {formatBRL(d.grossCents)}</span>
							</li>
						{/each}
					</ol>
				</div>
				<div class="card p-5">
					<h3 class="mb-3 text-sm font-semibold">Mais vendidos hoje</h3>
					{#if sales.top.length}
						<ol class="space-y-1 text-sm">
							{#each sales.top as p, i (p.sku)}
								<li class="flex items-center gap-2">
									<span class="w-4 text-muted tabular-nums">{i + 1}</span>
									<span class="flex-1 truncate">{p.name}</span>
									<span class="text-muted tabular-nums">{p.units} un.</span>
									<Money cents={p.salesCents} class="w-20 text-right tabular-nums" />
								</li>
							{/each}
						</ol>
					{:else}
						<p class="text-sm text-muted">Nenhuma venda ainda hoje.</p>
					{/if}
				</div>
			</div>
		</section>
	{/if}

	<section class="flex flex-wrap gap-3">
		{#if data.staff.role !== 'kitchen'}
			<a class="btn-primary btn-lg" href="/staff/pos">Novo pedido no caixa</a>
		{/if}
		<a class="btn-secondary btn-lg" href="/kitchen">Abrir tela da cozinha</a>
		<a class="btn-secondary btn-lg" href="/staff/orders">Todos os pedidos</a>
	</section>

	{#if data.urgent.length}
		<section class="space-y-2">
			<h2 class="section-label">Aguardando confirmação</h2>
			<ul class="divide-y divide-line card">
				{#each data.urgent as o (o.id)}
					<li>
						<a
							href="/staff/orders/{o.id}"
							class="flex items-center justify-between gap-3 p-3 hover:bg-stone-50"
						>
							<span class="font-semibold">#{o.orderNumber}</span>
							<span class="flex-1 text-sm text-muted"
								>{o.channel === 'ifood' ? `iFood ${o.channelDisplayId ?? ''}` : o.channel} · {o.customerLabel ??
									''}</span
							>
							<Money cents={o.totalCents} />
							<Age since={o.createdAt} warnAfter={o.channel === 'ifood' ? 4 : 3} lateAfter={6} />
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>
