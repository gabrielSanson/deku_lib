<script lang="ts">
	import { fulfillmentLabel } from '#lib/domain/fulfillment.ts';
	import { enhance } from '$app/forms';
	import LiveBanner from '#lib/components/organisms/LiveBanner.svelte';
	import OrderActionBar from '#lib/components/organisms/OrderActionBar.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import PaymentBadge from '#lib/components/atoms/PaymentBadge.svelte';
	import StatusBadge from '#lib/components/atoms/StatusBadge.svelte';
	import { useLiveOrders } from '#lib/client/live.svelte.ts';
	import {
		allowedNextStatuses,
		roleMayTransition,
		STATUS_LABEL_PT
	} from '#lib/domain/order-status.ts';
	import { mayConfirm } from '#lib/domain/payment-rules.ts';
	import { METHOD_LABEL_PT } from '#lib/domain/tender-labels.ts';
	import { formatDateTime, formatTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const live = useLiveOrders(() => data.live);
	const o = $derived(data.order);
	const next = $derived(
		allowedNextStatuses(o.status).filter(
			(s) =>
				roleMayTransition(data.staff.role, o.status, s) &&
				// Unpaid orders confirm by themselves once the payment is registered.
				(s !== 'confirmed' || mayConfirm(o.paymentPlan, o.paymentStatus))
		)
	);
	const manager = $derived(data.staff.role === 'admin');
	let refunding = $state<string | null>(null);
</script>

<svelte:head><title>{t('orderDetail.detailTitle', { n: o.orderNumber })}</title></svelte:head>
<LiveBanner {live} />

<main class="mx-auto grid max-w-5xl gap-4 p-4 lg:grid-cols-[1fr_320px]">
	<section class="space-y-4">
		<div class="flex flex-wrap items-center gap-3">
			<a href="/staff/orders" class="btn-ghost min-h-9">{t('orderDetail.back')}</a>
			<h1 class="page-title">#{o.orderNumber}</h1>
			<StatusBadge status={o.status} />
			<PaymentBadge status={o.paymentStatus} />
		</div>
		<p class="text-sm text-muted">
			{t('orderDetail.meta', {
				channel:
					o.channel === 'ifood'
						? t('orderDetail.channelIfood', { id: o.channelDisplayId ?? '' })
						: t(o.channel === 'web' ? 'orderDetail.channelWeb' : 'orderDetail.channelCounter'),
				fulfillment: fulfillmentLabel(o.fulfillmentType, o.tableLabel),
				courier:
					o.fulfillmentProvider === 'ifood_courier' ? `${t('orderDetail.ifoodCourier')} ` : '',
				created: formatDateTime(o.createdAt),
				promised: formatTime(o.promisedAt)
			})}
		</p>
		{#if o.customerLabel}<p class="text-lg font-semibold">{o.customerLabel}</p>{/if}
		{#if o.notes}<p class="alert-warn">{o.notes}</p>{/if}
		{#if o.cancelReason}<p class="alert-error">
				{t('orderDetail.reason', { reason: o.cancelReason })}
			</p>{/if}

		<div class="divide-y divide-line card">
			{#each o.items as item (item.id)}
				<div class="p-3">
					<div class="flex justify-between gap-2 font-semibold">
						<span>{item.quantity}× {item.productName}</span><Money cents={item.lineTotalCents} />
					</div>
					{#each item.modifiers as m, i (i)}
						<div class="flex justify-between text-sm text-muted">
							<span>{m.quantity > 1 ? `${m.quantity}× ` : ''}{m.optionName}</span>
							{#if m.unitPriceCents}<Money cents={m.unitPriceCents * m.quantity} />{/if}
						</div>
					{/each}
					{#if item.discountCents}
						<div class="flex justify-between text-sm text-ok">
							<span>{t('orderDetail.promo')}</span><span>−<Money cents={item.discountCents} /></span
							>
						</div>
					{/if}
					{#if item.allergyFlag}<p class="text-sm font-bold text-bad">
							{t('orderDetail.allergy')}
						</p>{/if}
					{#if item.note}<p class="text-sm italic">“{item.note}”</p>{/if}
				</div>
			{/each}
			<dl class="space-y-1 p-3 text-sm">
				<div class="flex justify-between">
					<dt>{t('orderDetail.subtotal')}</dt>
					<dd><Money cents={o.subtotalCents} /></dd>
				</div>
				{#if o.discountCents}<div class="flex justify-between">
						<dt>{t('orderDetail.discount')}{o.offerName ? ` · ${o.offerName}` : ''}</dt>
						<dd>−<Money cents={o.discountCents} /></dd>
					</div>{/if}
				{#if o.deliveryFeeCents}<div class="flex justify-between">
						<dt>{t('orderDetail.delivery')}</dt>
						<dd><Money cents={o.deliveryFeeCents} /></dd>
					</div>{/if}
				<div class="flex justify-between text-base font-bold">
					<dt>{t('orderDetail.total')}</dt>
					<dd><Money cents={o.totalCents} /></dd>
				</div>
			</dl>
		</div>

		{#if o.address}
			<div class="card p-3 text-sm">
				<h2 class="mb-1 font-semibold">{t('orderDetail.address')}</h2>
				<p>{o.address.recipient}</p>
				<p>
					{o.address.street}, {o.address.number}
					{o.address.complement ?? ''} · {o.address.neighborhood}
				</p>
				<p>
					{t('orderDetail.cep', {
						city: o.address.city,
						state: o.address.state,
						cep: o.address.cep
					})}
				</p>
				{#if o.address.instructions}<p class="text-muted">{o.address.instructions}</p>{/if}
			</div>
		{/if}

		<div class="card p-3">
			<h2 class="mb-2 font-semibold">{t('orderDetail.history')}</h2>
			{#if o.pushFailed}<p class="mb-2 text-sm text-bad">
					{t('orderDetail.pushFailed')}
				</p>{/if}
			<ol class="space-y-1 text-sm">
				{#each o.history as h, i (i)}
					<li class="flex justify-between gap-2">
						<span
							>{h.fromStatus ? `${STATUS_LABEL_PT[h.fromStatus]} → ` : ''}<strong
								>{STATUS_LABEL_PT[h.toStatus]}</strong
							>
							{h.reason ? `· ${h.reason}` : ''}</span
						>
						<span class="whitespace-nowrap text-muted"
							>{h.actorName ?? h.actorType} · {formatTime(h.occurredAt)}</span
						>
					</li>
				{/each}
			</ol>
		</div>
	</section>

	<aside class="space-y-4">
		<OrderActionBar {next} version={o.version} error={form?.error} />

		<div class="space-y-2 card p-3">
			<h2 class="font-semibold">{t('orderDetail.payments')}</h2>
			{#each o.tenders as tender (tender.id)}
				<div class="text-sm">
					<div class="flex justify-between">
						<span
							>{METHOD_LABEL_PT[tender.method as keyof typeof METHOD_LABEL_PT] ??
								tender.method}</span
						><Money cents={tender.amountCents} />
					</div>
					<div class="flex justify-between text-xs text-muted">
						<span
							>{tender.providerReference ?? ''}
							{tender.recordedByName ? `· ${tender.recordedByName}` : ''}</span
						>
						<PaymentBadge status={tender.status} />
					</div>
					{#if manager && tender.status === 'paid' && tender.provider === 'manual'}
						{#if refunding === tender.id}
							<form
								method="POST"
								action="?/refund"
								use:enhance={() =>
									async ({ update }) => {
										await update();
										refunding = null;
									}}
								class="mt-1 space-y-1"
							>
								<input type="hidden" name="tenderId" value={tender.id} />
								<input
									class="field"
									name="reason"
									placeholder={t('orderDetail.refundReason')}
									required
								/>
								<button class="btn-danger min-h-9 w-full text-sm"
									>{t('orderDetail.refundConfirm')}</button
								>
							</form>
						{:else}
							<button
								class="btn-ghost min-h-8 text-xs text-bad"
								onclick={() => (refunding = tender.id)}>{t('orderDetail.refund')}</button
							>
						{/if}
					{/if}
				</div>
			{:else}
				<p class="text-sm text-muted">{t('orderDetail.noPayments')}</p>
			{/each}
			{#if o.paymentPlan === 'pix_key' && o.paymentStatus !== 'paid' && !['cancelled', 'rejected'].includes(o.status)}
				<p class="alert-warn text-sm">
					O cliente vai pagar por Pix na chave da loja. Confira no app do banco um Pix de
					<Money cents={o.totalCents} /> com a referência <strong>PEDIDO{o.orderNumber}</strong> e registre
					o pagamento antes de aceitar.
				</p>
			{/if}
			{#if o.paymentStatus !== 'paid' && !['cancelled', 'rejected'].includes(o.status) && data.staff.role !== 'kitchen'}
				<a
					class="btn-secondary w-full"
					href="/staff/pos/{o.id}/payment{o.paymentPlan === 'pix_key'
						? '?method=external_pix'
						: ''}"
					>{t(
						o.paymentPlan === 'pix_key' ? 'orderDetail.registerPix' : 'orderDetail.receivePay'
					)}</a
				>
			{/if}
		</div>
	</aside>
</main>
