<script lang="ts">
	import { goto } from '$app/navigation';
	import Money from '#lib/components/atoms/Money.svelte';
	import PaymentBadge from '#lib/components/atoms/PaymentBadge.svelte';
	import AnalyticsMetric from '#lib/components/molecules/AnalyticsMetric.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import type { PaymentStatus } from '#lib/domain/order-status.ts';

	import { useLabels, useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
	const label = useLabels(t);
	const methodLabel = (m: string) => label.method(m);
	const paid = $derived(data.byMethod.filter((m) => m.status === 'paid'));
	const refunded = $derived(data.byMethod.filter((m) => m.status === 'refunded'));
	const totalPaid = $derived(paid.reduce((n, m) => n + m.amountCents, 0));
	const cash = $derived(paid.find((m) => m.method === 'cash')?.amountCents ?? 0);
</script>

<svelte:head><title>{t('recon.tabTitle')}</title></svelte:head>

<main class="mx-auto max-w-4xl space-y-4 p-4">
	<div class="flex flex-wrap items-center gap-2">
		<h1 class="mr-auto page-title">{t('recon.title')}</h1>
		<input
			class="field w-44"
			type="date"
			value={data.day}
			onchange={(e) => goto(`?day=${e.currentTarget.value}`)}
			aria-label={t('recon.day')}
		/>
	</div>
	<p class="text-sm text-muted">
		{t('recon.intro')}
	</p>

	<section class="grid gap-3 sm:grid-cols-3">
		<AnalyticsMetric label={t('recon.totalPaid')} value={formatBRL(totalPaid)} />
		<AnalyticsMetric label={t('recon.cash')} value={formatBRL(cash)} />
		<AnalyticsMetric
			label={t('recon.ifood', { n: data.ifood.count })}
			value={formatBRL(data.ifood.amountCents)}
		/>
	</section>

	<section class="card p-4">
		<h2 class="mb-2 font-semibold">{t('recon.byMethod')}</h2>
		<table class="w-full text-sm">
			<thead
				><tr class="text-left text-muted"
					><th>{t('recon.method')}</th><th>{t('recon.count')}</th><th class="text-right"
						>{t('recon.received')}</th
					></tr
				></thead
			>
			<tbody>
				{#each paid as m (m.method)}<tr
						><td class="py-1">{methodLabel(m.method)}</td><td>{m.count}</td><td class="text-right"
							><Money cents={m.amountCents} /></td
						></tr
					>{:else}<tr
						><td colspan="3" class="py-4 text-center text-muted">{t('recon.noPayments')}</td></tr
					>{/each}
				{#each refunded as m (m.method)}<tr class="text-bad"
						><td class="py-1">{t('recon.refunded', { method: methodLabel(m.method) })}</td><td
							>{m.count}</td
						><td class="text-right">−<Money cents={m.amountCents} /></td></tr
					>{/each}
			</tbody>
		</table>
	</section>

	<section class="card p-4">
		<h2 class="mb-2 font-semibold">
			{t('recon.drawer', { n: data.sessions.length })}
		</h2>
		{#if data.sessions.length === 0}
			<p class="text-sm text-muted">{t('recon.drawerNone')}</p>
		{:else}
			<table class="w-full text-sm">
				<thead
					><tr class="text-left text-muted"
						><th>{t('recon.openedBy')}</th><th>{t('recon.closedBy')}</th><th class="text-right"
							>{t('recon.expected')}</th
						><th class="text-right">{t('recon.counted')}</th><th class="text-right"
							>{t('recon.difference')}</th
						></tr
					></thead
				>
				<tbody class="divide-y divide-line">
					{#each data.sessions as s (s.id)}
						<tr>
							<td class="py-2">{s.openedByName}</td>
							<td>{s.status === 'open' ? t('recon.stillOpen') : (s.closedByName ?? '')}</td>
							<td class="text-right"
								>{#if s.expectedCents !== null}<Money cents={s.expectedCents} />{/if}</td
							>
							<td class="text-right"
								>{#if s.countedCents !== null}<Money cents={s.countedCents} />{/if}</td
							>
							<td class="text-right font-semibold {(s.differenceCents ?? 0) < 0 ? 'text-bad' : ''}"
								>{#if s.differenceCents !== null}<Money cents={s.differenceCents} />{/if}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section class="card p-4">
		<h2 class="mb-2 font-semibold">{t('recon.issues', { n: data.issues.length })}</h2>
		{#if data.issues.length === 0}
			<p class="alert-ok">{t('recon.allGood')}</p>
		{:else}
			<table class="w-full text-sm">
				<thead
					><tr class="text-left text-muted"
						><th>{t('recon.order')}</th><th>{t('recon.status')}</th><th>{t('recon.payment')}</th><th
							class="text-right">{t('recon.total')}</th
						><th class="text-right">{t('recon.received')}</th></tr
					></thead
				>
				<tbody class="divide-y divide-line">
					{#each data.issues as i (i.id)}
						<tr>
							<td class="py-2"
								><a class="font-semibold underline" href="/staff/orders/{i.id}">#{i.orderNumber}</a
								></td
							>
							<td>{i.status}</td>
							<td><PaymentBadge status={i.paymentStatus as PaymentStatus} /></td>
							<td class="text-right"><Money cents={i.totalCents} /></td>
							<td class="text-right"><Money cents={i.paidCents} /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>
</main>
