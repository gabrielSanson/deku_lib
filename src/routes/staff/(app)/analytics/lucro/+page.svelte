<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import type { TextKey } from '#lib/texts/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const r = $derived(data.report);
	const presets = ['7d', '30d', 'month'] as const;
	const s = $derived(r.settings);
	const pct = (bps: number) => (bps / 100).toLocaleString('pt-BR');
	const rows = $derived([...r.channels, r.total]);
	const channelName = (c: string) =>
		c === 'total' ? t('profit.total') : t(`analytics.channel.${c}` as TextKey) || c;
</script>

<svelte:head><title>{t('profit.title')}</title></svelte:head>

<main class="space-y-4 p-4 sm:p-6">
	<a class="text-sm underline" href="/staff/analytics">← {t('nav.relatorios')}</a>
	<h1 class="page-title">{t('profit.title')}</h1>
	<p class="text-sm text-muted">{t('profit.intro')}</p>
	<div class="flex flex-wrap gap-2">
		{#each presets as p (p)}
			<a
				class="btn min-h-9 text-sm {data.preset === p ? 'bg-ink text-canvas' : 'btn-secondary'}"
				href="?range={p}">{t(`analytics.preset.${p}` as TextKey)}</a
			>
		{/each}
		<span class="self-center text-sm text-muted">{data.range.from} – {data.range.to}</span>
	</div>

	{#if r.ifood.orders > 0 && r.ifood.extraCents > 0}
		<p class="alert-warn">
			{t('profit.ifoodExtra', { n: r.ifood.orders, value: formatBRL(r.ifood.extraCents) })}
		</p>
	{/if}
	{#if r.total.withoutRecipe > 0}
		<p class="text-sm">
			{t('profit.withoutRecipe', { n: r.total.withoutRecipe })}
			<a class="underline" href="/staff/estoque/fichas">{t('stock.tab.recipes')}</a>
		</p>
	{/if}

	<div class="overflow-x-auto card">
		<table class="w-full text-sm tabular-nums">
			<thead class="text-left text-muted">
				<tr>
					<th class="p-2">{t('profit.channel')}</th>
					<th class="p-2 text-right">{t('profit.orders')}</th>
					<th class="p-2 text-right">{t('profit.gross')}</th>
					<th class="p-2 text-right">{t('profit.discounts')}</th>
					<th class="p-2 text-right">{t('profit.commissions')}</th>
					<th class="p-2 text-right">{t('profit.fees')}</th>
					<th class="p-2 text-right">{t('profit.delivery')}</th>
					<th class="p-2 text-right">{t('profit.food')}</th>
					<th class="p-2 text-right">{t('profit.net')}</th>
					<th class="p-2 text-right">{t('profit.perOrder')}</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as c (c.channel)}
					<tr class="border-t border-line {c.channel === 'total' ? 'font-bold' : ''}">
						<td class="p-2">{channelName(c.channel)}</td>
						<td class="p-2 text-right">{c.orders}</td>
						<td class="p-2 text-right">{formatBRL(c.grossCents)}</td>
						<td class="p-2 text-right">−{formatBRL(c.discountCents)}</td>
						<td class="p-2 text-right">−{formatBRL(c.commissionCents)}</td>
						<td class="p-2 text-right">−{formatBRL(c.feesCents)}</td>
						<td class="p-2 text-right">−{formatBRL(c.deliveryCostCents)}</td>
						<td class="p-2 text-right">−{formatBRL(c.foodCostCents)}{c.withoutRecipe ? '*' : ''}</td
						>
						<td class="p-2 text-right">{formatBRL(c.netCents)}</td>
						<td class="p-2 text-right"
							>{c.orders ? formatBRL(Math.round(c.netCents / c.orders)) : '—'}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if r.total.withoutRecipe > 0}<p class="text-xs text-muted">{t('profit.asterisk')}</p>{/if}

	<form method="POST" action="?/settings" use:enhance class="grid gap-3 card p-4 sm:grid-cols-4">
		<h2 class="font-semibold sm:col-span-4">{t('profit.settings')}</h2>
		<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
		<TextField
			label={t('profit.ifoodCommission')}
			name="ifood"
			inputmode="decimal"
			value={pct(s.ifoodCommissionBps)}
		/>
		<TextField
			label={t('profit.ifoodDeliveryCommission')}
			name="ifoodDelivery"
			inputmode="decimal"
			value={pct(s.ifoodDeliveryCommissionBps)}
		/>
		<TextField
			label={t('profit.odCommission')}
			name="od"
			inputmode="decimal"
			value={pct(s.odCommissionBps)}
		/>
		<TextField
			label={t('profit.deliveryCost')}
			name="deliveryCost"
			inputmode="decimal"
			value={(s.deliveryCostCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
		/>
		<div class="sm:col-span-4">
			<button class="btn-primary">{t('settings.save')}</button>
			{#if form && 'saved' in form}<span class="ml-2 text-sm">{t('settings.saved')}</span>{/if}
		</div>
	</form>
</main>
