<script lang="ts">
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import SearchField from '#lib/components/molecules/SearchField.svelte';
	import SegmentedTabs from '#lib/components/molecules/SegmentedTabs.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import { formatDateTime } from '#lib/domain/time.ts';
	import type { TextKey } from '#lib/texts/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
	const query = (over: Record<string, string>) => {
		const p = new SvelteURLSearchParams({
			filtro: data.filter,
			origem: data.source,
			q: data.q,
			...over
		});
		for (const [k, v] of [...p]) if (!v || (k === 'filtro' && v === 'all')) p.delete(k);
		return `?${p}`;
	};
	const exportHref = (purpose: string) =>
		`/staff/clientes/exportar${query({ finalidade: purpose })}`;
</script>

<svelte:head><title>{t('customers.tabTitle')}</title></svelte:head>

<main class="mx-auto max-w-6xl space-y-4 p-4">
	<h1 class="page-title">{t('customers.title')}</h1>
	<p class="text-sm text-muted">{t('customers.intro')}</p>

	<div class="flex flex-wrap items-center gap-3">
		<SegmentedTabs
			label={t('customers.filter')}
			active={data.filter}
			tabs={data.filters.map((f) => ({
				key: f,
				label: t(`customers.filter.${f}` as TextKey),
				href: query({ filtro: f })
			}))}
		/>
		<form method="GET" class="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
			<input type="hidden" name="filtro" value={data.filter} />
			<input type="hidden" name="origem" value={data.source} />
			<SearchField
				label={t('customers.search')}
				placeholder={t('customers.search')}
				name="q"
				value={data.q}
				class="min-w-56 flex-1 sm:max-w-80"
			/>
			<SelectField
				label={t('customers.source')}
				hideLabel
				class="max-w-48"
				value={data.source}
				onchange={(e) => goto(query({ origem: e.currentTarget.value }))}
			>
				<option value="">{t('customers.source.any')}</option>
				{#each data.sources as s (s)}
					<option value={s}>{t(`customers.source.${s}` as TextKey)}</option>
				{/each}
			</SelectField>
		</form>
	</div>

	<div class="flex flex-wrap gap-2 text-sm">
		<a class="btn-ghost" href={exportHref('marketing')} download>{t('customers.exportMarketing')}</a
		>
		<a class="btn-ghost" href={exportHref('delivery')} download>{t('customers.exportDelivery')}</a>
		<a class="btn-ghost" href="/staff/clientes/solicitacoes">{t('privacy.staffLink')}</a>
	</div>

	{#if data.customers.length === 0}
		<p class="text-muted">{t('customers.none')}</p>
	{:else}
		<div class="overflow-x-auto card">
			<table class="w-full text-sm">
				<thead class="text-left text-muted">
					<tr>
						<th class="p-2">{t('customers.name')}</th>
						<th class="p-2">{t('customers.source')}</th>
						<th class="p-2 text-right">{t('customers.orders')}</th>
						<th class="p-2 text-right">{t('customers.total')}</th>
						<th class="p-2">{t('customers.lastOrder')}</th>
						<th class="p-2"></th>
					</tr>
				</thead>
				<tbody>
					{#each data.customers as c (c.id)}
						<tr class="border-t border-line">
							<td class="p-2">
								<a class="font-semibold underline" href="/staff/clientes/{c.id}">{c.name ?? '—'}</a>
								<div class="text-xs text-muted">{c.phone ?? c.email ?? ''}</div>
							</td>
							<td class="p-2">{t(`customers.source.${c.source}` as TextKey)}</td>
							<td class="p-2 text-right tabular-nums">{c.ordersCount}</td>
							<td class="p-2 text-right tabular-nums">{formatBRL(c.totalSpentCents)}</td>
							<td class="p-2">{c.lastOrderAt ? formatDateTime(c.lastOrderAt) : '—'}</td>
							<td class="p-2">
								<span
									class="rounded-full px-2 py-0.5 text-xs {c.mayMarket
										? 'bg-ok/15 text-ok'
										: 'bg-line text-muted'}"
									>{c.mayMarket ? t('customers.consent') : t('customers.noConsent')}</span
								>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</main>
