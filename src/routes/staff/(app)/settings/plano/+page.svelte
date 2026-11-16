<script lang="ts">
	import StatusPill from '#lib/components/atoms/StatusPill.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import { formatDateTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
	let copied = $state(false);
	const date = (d: Date | string | null) => (d ? formatDateTime(d).split(' ')[0] : '');
	const statusTone = {
		trial: 'info',
		active: 'ok',
		past_due: 'warn',
		suspended: 'bad',
		closed: 'quiet'
	} as const;
	const invoiceTone = { open: 'warn', paid: 'ok', void: 'quiet' } as const;
</script>

<svelte:head><title>{t('plan.tabTitle')}</title></svelte:head>

<div class="space-y-4">
	<h1 class="page-title">{t('nav.plano')}</h1>
	{#if !data.hosted}
		<p class="card p-4 text-sm">{t('plan.selfHosted')}</p>
	{:else}
		<section class="space-y-2 card p-4">
			<div class="flex flex-wrap items-center gap-2">
				<h2 class="text-lg font-bold">{data.plan?.name ?? ''}</h2>
				<StatusPill tone={statusTone[data.status]} label={t(`plan.status.${data.status}`)} />
			</div>
			{#if data.plan}
				<p class="text-sm">{t('plan.price', { price: formatBRL(data.plan.priceCents) })}</p>
			{/if}
			{#if data.status === 'trial' && data.trialEndsAt}
				<p class="text-sm">{t('plan.trialUntil', { date: date(data.trialEndsAt) })}</p>
			{/if}
		</section>

		{#if data.open}
			<section class="space-y-3 card p-4">
				<h2 class="text-lg font-bold">{t('plan.openInvoice')}</h2>
				<p class="text-sm">
					{t('plan.invoiceLine', {
						amount: formatBRL(data.open.amountCents),
						due: date(data.open.dueAt)
					})}
				</p>
				{#if data.open.pixSvg}
					<div class="w-56 rounded-lg bg-white p-2">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- SVG made on the server by qrcode from our own Pix payload -->
						{@html data.open.pixSvg}
					</div>
					<div class="space-y-1">
						<code class="block rounded border border-line p-2 text-xs break-all"
							>{data.open.pixPayload}</code
						>
						<button
							class="btn-secondary"
							onclick={async () => {
								await navigator.clipboard.writeText(data.open?.pixPayload ?? '');
								copied = true;
							}}>{copied ? t('plan.copied') : t('plan.copy')}</button
						>
					</div>
					<p class="text-xs text-muted">{t('plan.afterPaying')}</p>
				{:else}
					<p class="text-sm">{t('plan.noPixYet')}</p>
				{/if}
			</section>
		{/if}

		<section class="space-y-2 card p-4">
			<h2 class="text-lg font-bold">{t('plan.history')}</h2>
			{#if data.history.length === 0}
				<p class="text-sm text-muted">{t('plan.noInvoices')}</p>
			{:else}
				<ul class="divide-y divide-line">
					{#each data.history as inv (inv.id)}
						<li class="flex items-center justify-between gap-2 py-2 text-sm">
							<span>{inv.periodStart.slice(5, 7)}/{inv.periodStart.slice(0, 4)}</span>
							<span>{formatBRL(inv.amountCents)}</span>
							<StatusPill tone={invoiceTone[inv.status]} label={t(`plan.invoice.${inv.status}`)} />
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>
