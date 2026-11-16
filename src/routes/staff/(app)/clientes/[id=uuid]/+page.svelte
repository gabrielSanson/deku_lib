<script lang="ts">
	import StatusBadge from '#lib/components/atoms/StatusBadge.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import { formatDateTime } from '#lib/domain/time.ts';
	import type { TextKey } from '#lib/texts/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
	const c = $derived(data.customer);
</script>

<svelte:head
	><title>{c.name ?? t('customers.title')} · {t('customers.tabTitle')}</title></svelte:head
>

<main class="mx-auto max-w-4xl space-y-4 p-4">
	<a class="btn-ghost" href="/staff/clientes">{t('customers.back')}</a>
	<section class="space-y-2 card p-4">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h1 class="page-title">{c.name ?? '—'}</h1>
			<span
				class="rounded-full px-2 py-0.5 text-xs {c.mayMarket
					? 'bg-ok/15 text-ok'
					: 'bg-line text-muted'}"
				>{c.mayMarket ? t('customers.consent') : t('customers.noConsent')}</span
			>
		</div>
		<dl class="grid gap-2 text-sm sm:grid-cols-2">
			<div>
				<dt class="text-muted">{t('customers.phone')}</dt>
				<dd>{c.phone ?? '—'}</dd>
			</div>
			<div>
				<dt class="text-muted">{t('customers.email')}</dt>
				<dd>{c.email ?? '—'}</dd>
			</div>
			<div>
				<dt class="text-muted">{t('customers.source')}</dt>
				<dd>{t(`customers.source.${c.source}` as TextKey)}</dd>
			</div>
			<div>
				<dt class="text-muted">{t('customers.orders')}</dt>
				<dd>{c.ordersCount} · {formatBRL(c.totalSpentCents)}</dd>
			</div>
			<div>
				<dt class="text-muted">{t('customers.firstOrder')}</dt>
				<dd>{c.firstOrderAt ? formatDateTime(c.firstOrderAt) : '—'}</dd>
			</div>
			<div>
				<dt class="text-muted">{t('customers.lastOrder')}</dt>
				<dd>{c.lastOrderAt ? formatDateTime(c.lastOrderAt) : '—'}</dd>
			</div>
		</dl>
	</section>
	<section class="space-y-2 card p-4">
		<h2 class="font-semibold">{t('customers.ordersTitle')}</h2>
		<ul class="divide-y divide-line text-sm">
			{#each c.orders as o (o.id)}
				<li class="flex flex-wrap items-center justify-between gap-2 py-2">
					<a class="underline" href="/staff/orders/{o.id}">#{o.orderNumber}</a>
					<span class="text-muted">{formatDateTime(o.createdAt)}</span>
					<StatusBadge status={o.status as never} />
					<span class="tabular-nums">{formatBRL(o.totalCents)}</span>
				</li>
			{/each}
		</ul>
	</section>
</main>
