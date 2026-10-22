<script lang="ts">
	import { goto } from '$app/navigation';
	import Money from '#lib/components/atoms/Money.svelte';
	import AnalyticsMetric from '#lib/components/molecules/AnalyticsMetric.svelte';
	import DailySalesChart from '#lib/components/organisms/DailySalesChart.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import { METHOD_LABEL_PT } from '#lib/domain/tender-labels.ts';
	import { formatDateTime } from '#lib/domain/time.ts';
	import type { TextKey } from '#lib/texts/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
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
			label: t('analytics.m.placed'),
			value: String(c.placed),
			d: delta(c.placed, p.placed),
			href: '/staff/orders?status=all'
		},
		{
			key: 'gross',
			label: t('analytics.m.gross'),
			value: formatBRL(c.grossCents),
			d: delta(c.grossCents, p.grossCents)
		},
		{
			key: 'net',
			label: t('analytics.m.net'),
			value: formatBRL(c.netCents),
			d: delta(c.netCents, p.netCents)
		},
		{
			key: 'aov',
			label: t('analytics.m.aov'),
			value: c.aovCents === null ? '—' : formatBRL(c.aovCents),
			d: c.aovCents && p.aovCents ? delta(c.aovCents, p.aovCents) : null
		},
		{
			key: 'collected',
			label: t('analytics.m.collected'),
			value: formatBRL(c.collectedCents),
			d: delta(c.collectedCents, p.collectedCents),
			href: '/staff/reconciliation'
		},
		{
			key: 'cancellationRate',
			label: t('analytics.m.cancellationRate'),
			value: `${c.cancelled} (${pct(c.cancellationRate)})`,
			d: null,
			href: '/staff/orders?status=cancelled'
		},
		{
			key: 'prepTime',
			label: t('analytics.m.prepTime'),
			value: c.prep.medianMin === null ? '—' : `${c.prep.medianMin} / ${c.prep.p90Min} min`,
			d: null,
			note: t('analytics.ordersNote', { n: c.prep.n })
		},
		{
			key: 'onTime',
			label: t('analytics.m.onTime'),
			value: pct(c.onTime.rate),
			d: null,
			note: t('analytics.ordersNote', { n: c.onTime.n })
		}
	]);

	const days = $derived([0, 1, 2, 3, 4, 5, 6].map((i) => t(`analytics.day.${i}` as TextKey)));
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
		const chName = (['counter', 'web', 'ifood'] as const).includes(ch as 'counter')
			? t(`analytics.channel.${ch as 'counter' | 'web' | 'ifood'}`)
			: ch;
		const fName = (['counter', 'pickup', 'delivery'] as const).includes(f as 'counter')
			? t(`analytics.fulfil.${f as 'counter' | 'pickup' | 'delivery'}`)
			: f;
		return `${chName} · ${fName}`;
	};
	const presets = $derived(
		(['today', 'yesterday', '7d', '28d', '30d', 'month'] as const).map(
			(k) => [k, t(`analytics.preset.${k}`)] as const
		)
	);
	const exportHref = $derived(
		`/staff/analytics/export?range=custom&from=${data.range.from}&to=${data.range.to}`
	);
</script>

<svelte:head><title>{t('analytics.tabTitle')}</title></svelte:head>

<main class="mx-auto max-w-6xl space-y-6 p-4">
	<div class="flex flex-wrap items-end gap-2">
		<h1 class="mr-auto page-title">{t('analytics.title')}</h1>
		{#each presets as [k, l] (k)}
			<button
				class="btn min-h-9 text-sm {data.preset === k ? 'bg-ink text-white' : 'btn-secondary'}"
				onclick={() => set({ range: k, from: '', to: '' })}>{l}</button
			>
		{/each}
		<input
			class="field w-40"
			type="date"
			bind:value={customFrom}
			aria-label={t('analytics.from')}
		/>
		<input class="field w-40" type="date" bind:value={customTo} aria-label={t('analytics.to')} />
		<button
			class="btn-secondary min-h-9 text-sm"
			onclick={() => set({ range: 'custom', from: customFrom, to: customTo })}
			>{t('analytics.apply')}</button
		>
		<select
			class="field w-40"
			value={data.filters.channel ?? ''}
			onchange={(e) => set({ channel: e.currentTarget.value })}
			aria-label={t('analytics.channel')}
		>
			<option value="">{t('analytics.allChannels')}</option><option value="counter"
				>{t('analytics.channel.counter')}</option
			><option value="web">{t('analytics.channel.web')}</option><option value="ifood"
				>{t('analytics.channel.ifood')}</option
			>
		</select>
		<a class="btn-secondary min-h-9 text-sm" href={exportHref}>{t('analytics.exportCsv')}</a>
	</div>
	<p class="text-sm text-muted">
		{t('analytics.rangeNote', {
			from: data.range.from,
			to: data.range.to,
			pfrom: data.prev.from,
			pto: data.prev.to,
			generated: formatDateTime(data.generatedAt)
		})}
	</p>

	<section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t('analytics.metrics')}>
		{#each cards as card (card.key)}
			<AnalyticsMetric
				label={card.label}
				value={card.value}
				delta={card.d}
				note={card.note}
				href={card.href}
				title={data.definitions[card.key as keyof typeof data.definitions]}
			/>
		{/each}
	</section>
	{#if c.paymentExceptions}<p class="alert-warn">
			{t('analytics.paymentExceptions', { n: c.paymentExceptions })}
		</p>{/if}
	{#if c.ifoodPaidCents}<p class="text-sm text-muted">
			{t('analytics.ifoodPaid')}
			<Money cents={c.ifoodPaidCents} />
		</p>{/if}

	<section class="card p-4">
		<h2 class="mb-3 font-semibold">{t('analytics.daily')}</h2>
		<DailySalesChart days={data.daily} />
	</section>

	<div class="grid gap-4 lg:grid-cols-2">
		<section class="card p-4">
			<h2 class="mb-3 font-semibold">{t('analytics.channels')}</h2>
			<table class="w-full text-sm">
				<thead
					><tr class="text-left text-muted"
						><th>{t('analytics.channel')}</th><th>{t('analytics.m.placed')}</th><th
							class="text-right">{t('analytics.sales')}</th
						></tr
					></thead
				>
				<tbody>
					{#each data.channels as ch (ch.key)}<tr
							><td class="py-1">{channelLabel(ch.key)}</td><td>{ch.orders}</td><td
								class="text-right"><Money cents={ch.grossCents} /></td
							></tr
						>{:else}<tr
							><td colspan="3" class="py-4 text-center text-muted">{t('analytics.noData')}</td></tr
						>{/each}
				</tbody>
			</table>
		</section>
		<section class="card p-4">
			<h2 class="mb-3 font-semibold">{t('analytics.methods')}</h2>
			<table class="w-full text-sm">
				<thead
					><tr class="text-left text-muted"
						><th>{t('analytics.method')}</th><th>{t('analytics.status')}</th><th
							>{t('analytics.qty')}</th
						><th class="text-right">{t('analytics.amount')}</th></tr
					></thead
				>
				<tbody>
					{#each data.methods as m, i (i)}<tr
							><td class="py-1"
								>{METHOD_LABEL_PT[m.method as keyof typeof METHOD_LABEL_PT] ?? m.method}</td
							><td>{m.status}</td><td>{m.count}</td><td class="text-right"
								><Money cents={m.amountCents} /></td
							></tr
						>{:else}<tr
							><td colspan="4" class="py-4 text-center text-muted">{t('analytics.noData')}</td></tr
						>{/each}
				</tbody>
			</table>
		</section>
	</div>

	<section class="overflow-x-auto card p-4">
		<h2 class="mb-1 font-semibold">{t('analytics.peaks')}</h2>
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
			<h2 class="mb-3 font-semibold">{t('analytics.products')}</h2>
			<table class="w-full text-sm">
				<thead
					><tr class="text-left text-muted"
						><th>{t('analytics.product')}</th><th>{t('analytics.units')}</th><th
							>{t('analytics.pctOrders')}</th
						><th class="text-right">{t('analytics.sales')}</th></tr
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
					{:else}<tr
							><td colspan="4" class="py-4 text-center text-muted">{t('analytics.noData')}</td></tr
						>{/each}
				</tbody>
			</table>
		</section>
		<section class="card p-4">
			<h2 class="mb-3 font-semibold">{t('analytics.modifiers')}</h2>
			<table class="w-full text-sm">
				<thead
					><tr class="text-left text-muted"
						><th>{t('analytics.option')}</th><th>{t('analytics.units')}</th><th class="text-right"
							>{t('analytics.sales')}</th
						></tr
					></thead
				>
				<tbody>
					{#each data.products.modifiers as m (m.name)}<tr
							><td class="py-1">{m.name}</td><td>{m.units}</td><td class="text-right"
								><Money cents={m.salesCents} /></td
							></tr
						>{:else}<tr
							><td colspan="3" class="py-4 text-center text-muted">{t('analytics.noData')}</td></tr
						>{/each}
				</tbody>
			</table>
		</section>
	</div>

	<section class="card p-4 text-sm">
		<h2 class="mb-2 font-semibold">{t('analytics.glossary')}</h2>
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
