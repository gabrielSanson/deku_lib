<script lang="ts">
	import { useTexts } from '#lib/texts/context.ts';
	import Money from '#lib/components/atoms/Money.svelte';
	import PaymentBadge from '#lib/components/atoms/PaymentBadge.svelte';
	import PickupCode from '#lib/components/atoms/PickupCode.svelte';
	import { METHOD_LABEL_PT } from '#lib/domain/tender-labels.ts';

	let { data } = $props();
	const t = useTexts();
</script>

<svelte:head><title>{t('posDone.tabTitle', { n: data.order.orderNumber })}</title></svelte:head>

<main class="mx-auto max-w-md space-y-5 p-6 text-center">
	<p class="text-sm font-medium text-muted">{t('posDone.sent')}</p>
	<!-- Read the code out; the customer can photograph it. -->
	<div>
		<p class="text-2xl font-bold">{t('posDone.code')}</p>
		<PickupCode
			number={data.order.orderNumber}
			class="text-8xl"
			fullClass="text-2xl font-bold text-muted"
			testid="pickup-code"
		/>
	</div>
	{#if data.order.customerLabel}<p class="text-xl">{data.order.customerLabel}</p>{/if}
	{#if data.order.tableLabel}<p class="text-muted">
			{t('posDone.table', { label: data.order.tableLabel })}
		</p>{/if}
	<div class="space-y-2 card p-4 text-left">
		<div class="flex justify-between">
			<span>{t('posDone.total')}</span><Money cents={data.order.totalCents} class="font-bold" />
		</div>
		<div class="flex justify-between">
			<span>{t('posDone.payment')}</span><PaymentBadge status={data.order.paymentStatus} />
		</div>
		{#each data.order.tenders as tender (tender.id)}
			<div class="flex justify-between text-sm text-muted">
				<span
					>{METHOD_LABEL_PT[tender.method as keyof typeof METHOD_LABEL_PT] ??
						tender.method}{tender.providerReference ? ` · ${tender.providerReference}` : ''}</span
				>
				<Money cents={tender.amountCents} />
			</div>
			{#if tender.changeCents}<div class="flex justify-between text-sm">
					<span>{t('posDone.change')}</span><Money cents={tender.changeCents} />
				</div>{/if}
		{/each}
	</div>
	<a
		class="btn-secondary w-full"
		href="/staff/print/{data.order.id}?tipo=recibo&auto"
		target="_blank">{t('posDone.print')}</a
	>
	<a class="btn-primary w-full text-lg" href="/staff/pos">{t('posDone.new')}</a>
	<a class="btn-ghost w-full" href="/staff/orders/{data.order.id}">{t('posDone.details')}</a>
</main>
