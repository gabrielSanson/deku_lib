<script lang="ts">
	import { onMount } from 'svelte';
	import { fulfillmentLabel } from '#lib/domain/fulfillment.ts';
	import { formatBRL } from '#lib/domain/money.ts';
	import { pickupCode } from '#lib/domain/pickup.ts';
	import { METHOD_LABEL_PT } from '#lib/domain/tender-labels.ts';
	import { formatTime, SHOP_TZ } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
	const o = $derived(data.order);
	const kitchen = $derived(data.kind === 'kitchen');
	const paidTenders = $derived(o.tenders.filter((x) => x.status === 'paid'));
	const channel = $derived(
		o.channel === 'ifood'
			? 'iFood'
			: o.sourceMode === 'kiosk'
				? t('print.kiosk')
				: o.channel === 'web'
					? t('orderDetail.channelWeb')
					: t('orderDetail.channelCounter')
	);
	const stamp = (d: Date | string) =>
		new Date(d).toLocaleString('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: SHOP_TZ
		});

	onMount(() => {
		if (!data.auto) return;
		// Inside the kitchen screen's hidden frame the parent prints; opened on its own, print now.
		if (window.parent !== window) return;
		window.addEventListener('afterprint', () => window.close(), { once: true });
		setTimeout(() => window.print(), 150);
	});
</script>

<svelte:head>
	<title>{t(kitchen ? 'print.kitchenTitle' : 'print.receiptTitle', { n: o.orderNumber })}</title>
</svelte:head>

<div class="no-print bar">
	<button onclick={() => window.print()}>{t('print.print')}</button>
	<a href={kitchen ? '?tipo=recibo' : '?tipo=cozinha'}
		>{kitchen ? t('print.toReceipt') : t('print.toKitchen')}</a
	>
</div>

<article class="ticket">
	{#if kitchen}
		<p class="center big">{pickupCode(o.orderNumber)}</p>
		<p class="center strong">#{o.orderNumber}</p>
		<p class="center strong">{fulfillmentLabel(o.fulfillmentType, o.tableLabel)} · {channel}</p>
		{#if o.channelDisplayId}<p class="center">iFood {o.channelDisplayId}</p>{/if}
		<p class="center">
			{stamp(o.createdAt)}{o.promisedAt
				? ` · ${t('print.promised', { time: formatTime(o.promisedAt) })}`
				: ''}
		</p>
		{#if o.customerLabel}<p class="center strong">{o.customerLabel}</p>{/if}
		<hr />
		{#each o.items as item (item.id)}
			<div class="item">
				<p class="line strong">{item.quantity}× {item.productName}</p>
				{#each item.modifiers as m, i (i)}
					<p class="mod {m.optionName.startsWith('Sem ') ? 'strong' : ''}">
						{m.quantity > 1 ? `${m.quantity}× ` : ''}{m.optionName}
					</p>
				{/each}
				{#if item.allergyFlag}<p class="mod strong">{t('print.allergy')}</p>{/if}
				{#if item.note}<p class="mod">{t('print.itemNote', { note: item.note })}</p>{/if}
			</div>
		{/each}
		{#if o.notes}<hr />
			<p>{t('print.orderNote', { note: o.notes })}</p>{/if}
		{#if o.address}
			<hr />
			<p class="strong">{t('print.delivery', { name: o.address.recipient })}</p>
			<p>
				{o.address.street}, {o.address.number}{o.address.complement
					? ` – ${o.address.complement}`
					: ''}
			</p>
			<p>{o.address.neighborhood} · {o.address.city}</p>
			{#if o.address.instructions}<p>{o.address.instructions}</p>{/if}
		{/if}
		{#if o.paymentStatus !== 'paid'}<hr />
			<p class="center strong">{t('print.unpaid')}</p>{/if}
	{:else}
		<p class="center strong">{data.shop.name}</p>
		{#if data.shop.address}<p class="center">
				{data.shop.address}{data.shop.city ? ` · ${data.shop.city}` : ''}
			</p>{/if}
		{#if data.shop.phone}<p class="center">{data.shop.phone}</p>{/if}
		<hr />
		<p class="center big">{t('print.order', { n: o.orderNumber })}</p>
		<p class="center strong">{t('print.code', { code: pickupCode(o.orderNumber) })}</p>
		<p class="center">{fulfillmentLabel(o.fulfillmentType, o.tableLabel)} · {stamp(o.createdAt)}</p>
		{#if o.customerLabel}<p class="center">{o.customerLabel}</p>{/if}
		<hr />
		{#each o.items as item (item.id)}
			<div class="item">
				<p class="row">
					<span>{item.quantity}× {item.productName}</span><span
						>{formatBRL(item.lineTotalCents)}</span
					>
				</p>
				{#each item.modifiers as m, i (i)}
					<p class="mod">{m.quantity > 1 ? `${m.quantity}× ` : ''}{m.optionName}</p>
				{/each}
			</div>
		{/each}
		<hr />
		<p class="row"><span>{t('print.subtotal')}</span><span>{formatBRL(o.subtotalCents)}</span></p>
		{#if o.discountCents}<p class="row">
				<span>{t('print.discount')}{o.offerName ? ` (${o.offerName})` : ''}</span><span
					>−{formatBRL(o.discountCents)}</span
				>
			</p>{/if}
		{#if o.deliveryFeeCents}<p class="row">
				<span>{t('print.deliveryFee')}</span><span>{formatBRL(o.deliveryFeeCents)}</span>
			</p>{/if}
		<p class="row big"><span>{t('print.total')}</span><span>{formatBRL(o.totalCents)}</span></p>
		{#if paidTenders.length}
			<hr />
			{#each paidTenders as tender (tender.id)}
				<p class="row">
					<span
						>{METHOD_LABEL_PT[tender.method as keyof typeof METHOD_LABEL_PT] ?? tender.method}</span
					><span>{formatBRL(tender.amountCents)}</span>
				</p>
				{#if tender.changeCents}<p class="row">
						<span>{t('print.change')}</span><span>{formatBRL(tender.changeCents)}</span>
					</p>{/if}
			{/each}
		{:else if o.paymentStatus !== 'paid'}
			<p class="center strong">{t('print.pending')}</p>
		{/if}
		<hr />
		<p class="center">{t('print.thanks')}</p>
		<p class="center small">{t('print.notFiscal')}</p>
	{/if}
</article>

<style>
	:global(html),
	:global(body) {
		background: #fff;
		color: #000;
	}
	.ticket {
		width: 72mm;
		margin: 0 auto;
		padding: 2mm 0 6mm;
		font:
			13px/1.3 ui-monospace,
			'Courier New',
			monospace;
		color: #000;
	}
	.ticket p {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.center {
		text-align: center;
	}
	.strong {
		font-weight: 700;
	}
	.big {
		font-size: 22px;
		font-weight: 800;
	}
	.small {
		font-size: 11px;
	}
	.item {
		margin: 1.5mm 0;
	}
	.line {
		font-size: 15px;
	}
	.mod {
		padding-left: 4mm;
	}
	.row {
		display: flex;
		justify-content: space-between;
		gap: 2mm;
	}
	hr {
		border: 0;
		border-top: 1px dashed #000;
		margin: 2mm 0;
	}
	.bar {
		display: flex;
		gap: 12px;
		justify-content: center;
		padding: 12px;
		font:
			14px system-ui,
			sans-serif;
	}
	.bar button {
		padding: 8px 16px;
		border: 1px solid #000;
		border-radius: 6px;
		background: #fff;
		color: #000;
		cursor: pointer;
	}
	.bar a {
		align-self: center;
		color: #000;
	}
	@media print {
		@page {
			size: 80mm auto;
			margin: 0;
		}
		.no-print {
			display: none;
		}
	}
</style>
