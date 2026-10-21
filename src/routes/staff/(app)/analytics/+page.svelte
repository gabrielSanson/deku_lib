<script lang="ts">
	import { goto } from '$app/navigation';
	import Money from '#lib/components/Money.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import { METHOD_LABEL_PT } from '#lib/domain/tender-labels.ts';
	import { formatDateTime } from '#lib/domain/time.ts';

	let { data } = $props();
	const c = $derived(data.current);
	const p = $derived(data.previous);

	let customFrom = $state('');
	let customTo = $state('');
	$effect(() => {
		customFrom = data.range.from;
		customTo = data.range.to;
	});

	function set(params: Record<string, string>) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- short-lived local, not state
		const u = new URLSearchParams(location.search);
		for (const [k, v] of Object.entries(params)) {
			if (v) u.set(k, v);
			else u.delete(k);
		}
		goto(`?${u}`, { replace: true });
	}

	const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
	const delta = (cur: number, prev: number) => {
		if (!prev) return null;
		return (cur - prev) / prev;
	};
	const cards = $derived([
		{
			key: 'placed',
			label: 'Pedidos',
			value: String(c.placed),
			d: delta(c.placed, p.placed),
			href: '/staff/orders?status=all'
		},
		{
			key: 'gross',
			label: 'Vendas brutas',
			value: formatBRL(c.grossCents),
			d: delta(c.grossCents, p.grossCents)
		},
		{
			key: 'net',
			label: 'Vendas líquidas',
			value: formatBRL(c.netCents),
			d: delta(c.netCents, p.netCents)
		},
		{
			key: 'aov',
			label: 'Ticket médio',
			value: c.aovCents === null ? '—' : formatBRL(c.aovCents),
			d: c.aovCents && p.aovCents ? delta(c.aovCents, p.aovCents) : null
		},
		{
			key: 'collected',
			label: 'Recebido',
			value: formatBRL(c.collectedCents),
			d: delta(c.collectedCents, p.collectedCents),
			href: '/staff/reconciliation'
		},
		{
			key: 'cancellationRate',
			label: 'Cancelamentos',
			value: `${c.cancelled} (${pct(c.cancellationRate)})`,
			d: null,
			href: '/staff/orders?status=cancelled'
		},
		{
			key: 'prepTime',
			label: 'Preparo (mediana / p90)',
			value: c.prep.medianMin === null ? '—' : `${c.prep.medianMin} / ${c.prep.p90Min} min`,
			d: null,
			note: `${c.prep.n} pedidos`
		},
		{
			key: 'onTime',
			label: 'No prazo',
			value: pct(c.onTime.rate),
			d: null,
			note: `${c.onTime.n} pedidos`
		}
	]);

	const maxDaily = $derived(Math.max(1, ...data.daily.map((d) => d.grossCents)));
	const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
	const hours = $derived.by(() => {
		const hs = data.peaks.map((x) => x.hour);
		const min = hs.length ? Math.min(...hs, 10) : 10;
		const max = hs.length ? Math.max(...hs, 23) : 23;
		return Array.from({ length: max - min + 1 }, (_, i) => min + i);
	});
	const peak = $derived(new Map(data.peaks.map((x) => [`${x.dow}:${x.hour}`, x.n])));
	const maxPeak = $derived(Math.max(1, ...data.peaks.map((x) => x.n)));
	const channelLabel = (k: string) => {
		const [ch, f] = k.split(':');
		return `${{ counter: 'Balcão', web: 'Site', ifood: 'iFood' }[ch] ?? ch} · ${{ counter: 'balcão', pickup: 'retirada', delivery: 'entrega' }[f] ?? f}`;
	};
	const presets = [
		['today', 'Hoje'],
		['yesterday', 'Ontem'],
		['7d', '7 dias'],
		['28d', '28 dias'],
		['30d', '30 dias'],
		['month', 'Este mês']
	];
	const exportHref = $derived(
		`/staff/analytics/export?range=custom&from=${data.range.from}&to=${data.range.to}`
	);
</script>

<svelte:head><title>Relatórios · Equipe</title></svelte:head>

<main class="mx-auto max-w-6xl space-y-6 p-4">
	<div class="flex flex-wrap items-end gap-2">
		<h1 class="mr-auto page-title">Relatórios</h1>
		{#each presets as [k, l] (k)}
			<button
				class="btn min-h-9 text-sm {data.preset === k ? 'bg-ink text-white' : 'btn-secondary'}"
				onclick={() => set({ range: k, from: '', to: '' })}>{l}</button
			>
		{/each}
		<input class="field w-40" type="date" bind:value={customFrom} aria-label="De" />
		<input class="field w-40" type="date" bind:value={customTo} aria-label="Até" />
		<button
			class="btn-secondary min-h-9 text-sm"
			onclick={() => set({ range: 'custom', from: customFrom, to: customTo })}>Aplicar</button
		>
		<select
			class="field w-40"
			value={data.filters.channel ?? ''}
			onchange={(e) => set({ channel: e.currentTarget.value })}
			aria-label="Canal"
		>
			<option value="">Todos os canais</option><option value="counter">Balcão</option><option
				value="web">Site</option
			><option value="ifood">iFood</option>
		</select>
		<a class="btn-secondary min-h-9 text-sm" href={exportHref}>Exportar CSV</a>
	</div>
	<p class="text-sm text-muted">
		{data.range.from} a {data.range.to} (horário de Brasília), comparado com {data.prev.from} a {data
			.prev.to}. Gerado {formatDateTime(data.generatedAt)}. Valores operacionais, não contábeis.
	</p>

	<section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores">
		{#each cards as card (card.key)}
			<svelte:element
				this={card.href ? 'a' : 'div'}
				href={card.href}
				class="card p-4 {card.href ? 'hover:border-brand-500' : ''}"
				title={data.definitions[card.key as keyof typeof data.definitions]}
			>
				<div class="text-sm text-muted">{card.label}</div>
				<div class="text-2xl font-bold tabular-nums">{card.value}</div>
				{#if card.d !== null}
					<div class="text-xs {card.d >= 0 ? 'text-ok' : 'text-bad'}">
						{card.d >= 0 ? '▲' : '▼'}
						{Math.abs(Math.round(card.d * 100))}% vs. período anterior
					</div>
				{:else if card.note}
					<div class="text-xs text-muted">{card.note}</div>
				{/if}
			</svelte:element>
		{/each}
	</section>
	{#if c.paymentExceptions}<p class="alert-warn">
			{c.paymentExceptions} pedido(s) com pagamento falho ou desconhecido no período.
		</p>{/if}
	{#if c.ifoodPaidCents}<p class="text-sm text-muted">
			Pago via iFood (fora do caixa): <Money cents={c.ifoodPaidCents} />
		</p>{/if}

	<section class="card p-4">
		<h2 class="mb-3 font-semibold">Vendas por dia</h2>
		<div class="flex h-48 items-end gap-1" aria-hidden="true">
			{#each data.daily as d (d.day)}
				<div class="group relative flex-1">
					<div
						class="rounded-t bg-brand-500"
						style="height: {Math.max(2, (d.grossCents / maxDaily) * 180)}px"
					></div>
				</div>
			{/each}
		</div>
		<details class="mt-2 text-sm">
			<summary class="cursor-pointer text-muted">Ver tabela</summary>
			<table class="mt-2 w-full">
				<thead
					><tr class="text-left text-muted"
						><th>Dia</th><th>Pedidos</th><th class="text-right">Vendas brutas</th></tr
					></thead
				>
				<tbody
					>{#each data.daily as d (d.day)}<tr
							><td>{d.day}</td><td>{d.orders}</td><td class="text-right"
								><Money cents={d.grossCents} /></td
							></tr
						>{/each}</tbody
				>
			</table>
		</details>
	</section>

	<div class="grid gap-4 lg:grid-cols-2">
		<section class="card p-4">
			<h2 class="mb-3 font-semibold">Canais</h2>
			<table class="w-full text-sm">
				<thead
					><tr class="text-left text-muted"
						><th>Canal</th><th>Pedidos</th><th class="text-right">Vendas</th></tr
					></thead
				>
				<tbody>
					{#each data.channels as ch (ch.key)}<tr
							><td class="py-1">{channelLabel(ch.key)}</td><td>{ch.orders}</td><td
								class="text-right"><Money cents={ch.grossCents} /></td
							></tr
						>{:else}<tr><td colspan="3" class="py-4 text-center text-muted">Sem dados.</td></tr
						>{/each}
				</tbody>
			</table>
		</section>
		<section class="card p-4">
			<h2 class="mb-3 font-semibold">Formas de pagamento</h2>
			<table class="w-full text-sm">
				<thead
					><tr class="text-left text-muted"
						><th>Forma</th><th>Status</th><th>Qtd.</th><th class="text-right">Valor</th></tr
					></thead
				>
				<tbody>
					{#each data.methods as m, i (i)}<tr
							><td class="py-1"
								>{METHOD_LABEL_PT[m.method as keyof typeof METHOD_LABEL_PT] ?? m.method}</td
							><td>{m.status}</td><td>{m.count}</td><td class="text-right"
								><Money cents={m.amountCents} /></td
							></tr
						>{:else}<tr><td colspan="4" class="py-4 text-center text-muted">Sem dados.</td></tr
						>{/each}
				</tbody>
			</table>
		</section>
	</div>

	<section class="overflow-x-auto card p-4">
		<h2 class="mb-1 font-semibold">Horários de pico</h2>
		<p class="mb-3 text-xs text-muted">{data.definitions.peakHour}</p>
		<table class="text-xs">
			<thead
				><tr
					><th></th>{#each hours as h (h)}<th class="w-8 font-normal text-muted">{h}h</th
						>{/each}</tr
				></thead
			>
			<tbody>
				{#each days as dname, dow (dow)}
					<tr>
						<th class="pr-2 text-left font-normal text-muted">{dname}</th>
						{#each hours as h (h)}
							{@const n = peak.get(`${dow}:${h}`) ?? 0}
							<td
								class="h-7 w-8 text-center tabular-nums"
								style="background: rgb(234 88 12 / {n
									? 0.12 + (n / maxPeak) * 0.88
									: 0}); color: {n / maxPeak > 0.55 ? 'white' : 'inherit'}">{n || ''}</td
							>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</section>

	<div class="grid gap-4 lg:grid-cols-2">
		<section class="card p-4">
			<h2 class="mb-3 font-semibold">Produtos</h2>
			<table class="w-full text-sm">
				<thead
					><tr class="text-left text-muted"
						><th>Produto</th><th>Un.</th><th>% pedidos</th><th class="text-right">Vendas</th></tr
					></thead
				>
				<tbody>
					{#each data.products.products as pr (pr.sku)}
						<tr
							><td class="py-1">{pr.name}</td><td>{pr.units}</td><td
								>{c.placed - c.cancelled
									? Math.round((pr.orders / (c.placed - c.cancelled)) * 100)
									: 0}%</td
							><td class="text-right"><Money cents={pr.salesCents} /></td></tr
						>
					{:else}<tr><td colspan="4" class="py-4 text-center text-muted">Sem dados.</td></tr>{/each}
				</tbody>
			</table>
		</section>
		<section class="card p-4">
			<h2 class="mb-3 font-semibold">Adicionais e opções mais pedidos</h2>
			<table class="w-full text-sm">
				<thead
					><tr class="text-left text-muted"
						><th>Opção</th><th>Un.</th><th class="text-right">Vendas</th></tr
					></thead
				>
				<tbody>
					{#each data.products.modifiers as m (m.name)}<tr
							><td class="py-1">{m.name}</td><td>{m.units}</td><td class="text-right"
								><Money cents={m.salesCents} /></td
							></tr
						>{:else}<tr><td colspan="3" class="py-4 text-center text-muted">Sem dados.</td></tr
						>{/each}
				</tbody>
			</table>
		</section>
	</div>

	<section class="card p-4 text-sm">
		<h2 class="mb-2 font-semibold">Glossário</h2>
		<dl class="grid gap-2 md:grid-cols-2">
			{#each Object.entries(data.definitions) as [k, v] (k)}
				<div>
					<dt class="font-medium">{cards.find((x) => x.key === k)?.label ?? k}</dt>
					<dd class="text-muted">{v}</dd>
				</div>
			{/each}
		</dl>
	</section>
</main>
