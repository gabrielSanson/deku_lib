<script lang="ts">
	import Icon from '#lib/components/atoms/Icon.svelte';
	import IconChip from '#lib/components/atoms/IconChip.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import StatusPill from '#lib/components/atoms/StatusPill.svelte';
	import Age from '#lib/components/atoms/Age.svelte';
	import StatTile from '#lib/components/molecules/StatTile.svelte';
	import HourlyChart from '#lib/components/organisms/HourlyChart.svelte';
	import LiveBanner from '#lib/components/organisms/LiveBanner.svelte';
	import { useLiveOrders } from '#lib/client/live.svelte.ts';
	import { formatBRL } from '#lib/domain/money.ts';

	let { data } = $props();
	const live = useLiveOrders(() => data.live);

	// The clock and the "late" checks refresh every 15 seconds.
	let now = $state(Date.now());
	$effect(() => {
		const t = setInterval(() => (now = Date.now()), 15_000);
		return () => clearInterval(t);
	});

	// iFood cancels orders the shop does not confirm in time; warn well before that.
	const ifoodLate = $derived(
		data.urgent.filter(
			(o) => o.channel === 'ifood' && now - new Date(o.createdAt).getTime() > 5 * 60_000
		)
	);
	const awaitingPayment = $derived(data.urgent.filter((o) => o.paymentStatus !== 'paid'));
	const awaitingConfirm = $derived(data.urgent.filter((o) => o.paymentStatus === 'paid'));

	const hour = $derived(new Date(now).getHours());
	const greeting = $derived(hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite');
	const clock = $derived(
		new Intl.DateTimeFormat('pt-BR', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'America/Sao_Paulo'
		}).format(new Date(now))
	);
	const dateLabel = $derived(
		new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(
			new Date(now)
		)
	);

	const sales = $derived(data.sales);
	// Change against yesterday, as a fraction (0.12 = +12%); null when there is nothing to compare.
	const delta = (cur: number, prev: number | null | undefined) =>
		prev ? (cur - prev) / prev : null;
	const placedToday = $derived(sales ? sales.now.placed - sales.now.cancelled : null);
	const placedYesterday = $derived(sales ? sales.before.placed - sales.before.cancelled : null);
	const tiles = $derived([
		{
			icon: 'cart' as const,
			label: 'Pedidos hoje',
			value: placedToday === null ? '—' : String(placedToday),
			hint: `${data.counts.today} no total, com cancelados`,
			delta:
				placedToday === null || placedYesterday === null
					? null
					: delta(placedToday, placedYesterday),
			href: '/staff/orders'
		},
		{
			icon: 'cash' as const,
			label: 'Vendas brutas',
			value: sales ? formatBRL(sales.now.grossCents) : '—',
			hint: sales ? `Líquido ${formatBRL(sales.now.netCents)}` : undefined,
			delta: sales ? delta(sales.now.grossCents, sales.before.grossCents) : null,
			href: '/staff/analytics'
		},
		{
			icon: 'chef' as const,
			label: 'Em preparo',
			value: String(data.counts.open),
			hint: `de ${data.counts.today} pedidos`,
			delta: null,
			href: '/staff/orders'
		},
		{
			icon: 'timer' as const,
			label: 'Tempo médio',
			value:
				sales?.now.prep.medianMin == null ? '—' : `${Math.round(sales.now.prep.medianMin)} min`,
			hint: 'do confirmado ao pronto',
			delta: null,
			href: '/staff/analytics'
		}
	]);

	const shortcuts = $derived(
		[
			{
				href: '/staff/pos',
				icon: 'cart' as const,
				label: 'Novo pedido',
				show: data.staff.role !== 'kitchen'
			},
			{ href: '/staff/menu/edit', icon: 'burger' as const, label: 'Ver cardápio', show: true },
			{ href: '/staff/analytics', icon: 'chart' as const, label: 'Relatórios', show: true },
			{ href: '/staff/settings/staff', icon: 'users' as const, label: 'Equipe', show: true }
		].filter((s) => s.show)
	);

	const isAdmin = $derived(data.staff.role === 'admin');
	const channels = $derived([
		{ on: data.settings.webOrderingEnabled, label: 'Site', icon: 'home' as const },
		{ on: data.settings.pickupEnabled, label: 'Retirada', icon: 'bag' as const },
		{ on: data.settings.deliveryEnabled, label: 'Entrega', icon: 'truck' as const },
		{ on: data.settings.dineInEnabled, label: 'Mesa', icon: 'table' as const }
	]);
</script>

<svelte:head><title>Início · Equipe</title></svelte:head>
<LiveBanner {live} />

<main class="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
	{#if !data.setupDone && isAdmin}
		<div class="flex flex-wrap items-center justify-between gap-3 alert-warn">
			<span><strong>Falta terminar a configuração da loja.</strong> Leva poucos minutos.</span>
			<a class="btn-primary min-h-9" href="/staff/setup">Continuar configuração</a>
		</div>
	{/if}
	{#each data.ifoodAlerts as alert, i (i)}
		<div class="flex flex-wrap items-center justify-between gap-3 alert-error" role="alert">
			<span><strong>iFood:</strong> {alert}</span>
			{#if isAdmin}
				<a class="btn-secondary min-h-9" href="/staff/settings/integrations">Ver detalhes</a>
			{/if}
		</div>
	{/each}
	{#if ifoodLate.length}
		<p class="alert-error" role="alert">
			<strong>{ifoodLate.length} pedido(s) do iFood aguardando há mais de 5 min.</strong> Confirme antes
			de 8 min para o iFood não cancelar.
		</p>
	{/if}
	{#if data.counts.unpaid > 0}
		<a href="/staff/reconciliation" class="block alert-warn">
			{data.counts.unpaid} pedido(s) das últimas 24 h com pagamento pendente ou desconhecido.
		</a>
	{/if}
	{#if data.counts.dead > 0}
		<p class="alert-error">
			{data.counts.dead} evento(s) de integração com falha. Veja a página de integrações.
		</p>
	{/if}

	<header class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="text-sm font-medium text-muted capitalize">{dateLabel}</p>
			<h1 class="page-title">{greeting}, equipe</h1>
		</div>
		<p class="font-display text-2xl font-extrabold tabular-nums" aria-label="Hora atual">{clock}</p>
	</header>

	<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
		<div class="space-y-6">
			<section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo do dia">
				{#each tiles as t (t.label)}
					<a href={t.href} class="block transition-transform hover:-translate-y-0.5">
						<StatTile
							icon={t.icon}
							label={t.label}
							value={t.value}
							hint={t.hint}
							delta={t.delta}
							deltaLabel="vs. ontem"
						/>
					</a>
				{/each}
			</section>

			<section class="card p-5">
				<div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
					<h2 class="font-semibold">Hoje, hora a hora</h2>
					<a
						href="/staff/analytics"
						class="text-sm font-semibold underline decoration-brand-500 decoration-2 underline-offset-4"
						>Relatórios</a
					>
				</div>
				{#if sales}
					<HourlyChart points={sales.hours} />
				{:else}
					<p class="text-sm text-muted">Os números de vendas são vistos pelo admin.</p>
				{/if}
			</section>

			<section class="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Atalhos">
				{#each shortcuts as s (s.href)}
					<a
						href={s.href}
						class="flex flex-col gap-3 card p-4 transition-colors hover:border-brand-500"
					>
						<span
							class="grid size-10 place-items-center rounded-(--radius-control) bg-brand-500 text-black"
						>
							<Icon name={s.icon} class="size-5" />
						</span>
						<span class="font-semibold">{s.label}</span>
					</a>
				{/each}
			</section>
		</div>

		<aside class="space-y-6">
			<section class="card p-5" aria-labelledby="agora">
				<div class="mb-4 flex items-center justify-between gap-2">
					<h2 id="agora" class="font-semibold">Agora</h2>
					<a href="/staff/orders" class="btn-quiet min-h-9 px-3 text-sm">Ver pedidos</a>
				</div>

				{#if data.late.length}
					<h3 class="mb-2 text-xs font-bold tracking-wide text-muted uppercase">Em produção</h3>
					<ul class="mb-5 space-y-2">
						{#each data.late as o (o.id)}
							<li>
								<a
									href="/staff/orders/{o.id}"
									class="flex items-center justify-between gap-3 rounded-(--radius-control) border border-line p-3 hover:bg-quiet"
								>
									<span class="min-w-0">
										<span class="font-semibold">#{o.orderNumber}</span>
										<span class="block truncate text-sm text-muted"
											>{o.tableLabel
												? `Mesa ${o.tableLabel}`
												: (o.customerLabel ?? o.channel)}</span
										>
									</span>
									<StatusPill tone="bad" label="Em atraso" />
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mb-5 text-sm text-muted">Nenhum pedido atrasado.</p>
				{/if}

				{#if awaitingPayment.length}
					<h3 class="mb-2 text-xs font-bold tracking-wide text-muted uppercase">
						Aguardando pagamento
					</h3>
					<ul class="mb-5 space-y-2">
						{#each awaitingPayment as o (o.id)}
							<li>
								<a
									href="/staff/orders/{o.id}"
									class="flex items-center justify-between gap-3 rounded-(--radius-control) border border-line p-3 hover:bg-quiet"
								>
									<span class="font-semibold">#{o.orderNumber}</span>
									<span class="flex items-center gap-2 text-sm">
										<Money cents={o.totalCents} />
										<StatusPill tone="warn" label="Pagamento" />
									</span>
								</a>
							</li>
						{/each}
					</ul>
				{/if}

				{#if awaitingConfirm.length}
					<h3 class="mb-2 text-xs font-bold tracking-wide text-muted uppercase">
						Aguardando confirmação
					</h3>
					<ul class="space-y-2">
						{#each awaitingConfirm as o (o.id)}
							<li>
								<a
									href="/staff/orders/{o.id}"
									class="flex items-center justify-between gap-3 rounded-(--radius-control) border border-line p-3 hover:bg-quiet"
								>
									<span class="min-w-0">
										<span class="font-semibold">#{o.orderNumber}</span>
										<span class="block truncate text-sm text-muted"
											>{o.channel === 'ifood' ? `iFood ${o.channelDisplayId ?? ''}` : o.channel} · {o.customerLabel ??
												''}</span
										>
									</span>
									<Age
										since={o.createdAt}
										warnAfter={o.channel === 'ifood' ? 4 : 3}
										lateAfter={6}
									/>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="space-y-4 card p-5" aria-labelledby="loja">
				<div class="flex items-center justify-between gap-2">
					<h2 id="loja" class="font-semibold">Status da loja</h2>
					{#if data.settings.acceptingOrders}
						<StatusPill tone="ok" label="Aberta" />
					{:else}
						<StatusPill tone="bad" label="Fechada" />
					{/if}
				</div>
				<p class="flex items-center gap-2 text-sm text-muted">
					<Icon name="clock" class="size-4" />
					{data.inHours ? 'Dentro do horário de funcionamento' : 'Fora do horário de funcionamento'}
				</p>
				{#if !data.settings.acceptingOrders && data.settings.pauseReason}
					<p class="text-sm text-muted">{data.settings.pauseReason}</p>
				{/if}
				<div class="flex flex-wrap gap-2">
					{#each channels as c (c.label)}
						<IconChip icon={c.icon} label={c.label} tone={c.on ? 'brand' : 'quiet'} />
					{/each}
				</div>
				{#if isAdmin}
					{#if data.settings.acceptingOrders}
						<form method="POST" action="/staff/settings/store?/toggle">
							<input type="hidden" name="open" value="0" />
							<input type="hidden" name="pauseReason" value="Fechado pela equipe" />
							<button class="btn-danger w-full">Fechar loja</button>
						</form>
					{:else}
						<form method="POST" action="/staff/settings/store?/toggle">
							<input type="hidden" name="open" value="1" />
							<button class="btn-success w-full">Abrir loja</button>
						</form>
					{/if}
				{/if}
			</section>
		</aside>
	</div>
</main>
