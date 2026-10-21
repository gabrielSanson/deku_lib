<script lang="ts">
	import { fulfillmentLabel } from '#lib/domain/fulfillment.ts';
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import LiveBanner from '#lib/components/LiveBanner.svelte';
	import Money from '#lib/components/Money.svelte';
	import PaymentBadge from '#lib/components/PaymentBadge.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { useLiveOrders } from '#lib/client/live.svelte.ts';
	import {
		allowedNextStatuses,
		requiresReason,
		roleMayTransition,
		STATUS_LABEL_PT,
		type OrderStatus
	} from '#lib/domain/order-status.ts';
	import { mayConfirm } from '#lib/domain/payment-rules.ts';
	import { METHOD_LABEL_PT } from '#lib/domain/tender-labels.ts';
	import { formatDateTime, formatTime } from '#lib/domain/time.ts';

	let { data, form } = $props();
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
	let reasonFor = $state<OrderStatus | null>(null);
	let refunding = $state<string | null>(null);

	const actionLabel: Partial<Record<OrderStatus, string>> = {
		confirmed: 'Confirmar pedido',
		preparing: 'Iniciar preparo',
		ready: 'Marcar como pronto',
		completed: 'Entregue ao cliente',
		cancelled: 'Cancelar',
		rejected: 'Recusar'
	};
</script>

<svelte:head><title>Pedido #{o.orderNumber}</title></svelte:head>
<LiveBanner {live} />

<main class="mx-auto grid max-w-5xl gap-4 p-4 lg:grid-cols-[1fr_320px]">
	<section class="space-y-4">
		<div class="flex flex-wrap items-center gap-3">
			<a href="/staff/orders" class="btn-ghost min-h-9">← Pedidos</a>
			<h1 class="page-title">#{o.orderNumber}</h1>
			<StatusBadge status={o.status} />
			<PaymentBadge status={o.paymentStatus} />
		</div>
		<p class="text-sm text-muted">
			{o.channel === 'ifood'
				? `iFood ${o.channelDisplayId ?? ''}`
				: o.channel === 'web'
					? 'Site'
					: 'Balcão'} ·
			{fulfillmentLabel(o.fulfillmentType, o.tableLabel)}
			{o.fulfillmentProvider === 'ifood_courier' ? '(entregador iFood)' : ''} · criado {formatDateTime(
				o.createdAt
			)} · prometido {formatTime(o.promisedAt)}
		</p>
		{#if o.customerLabel}<p class="text-lg font-semibold">{o.customerLabel}</p>{/if}
		{#if o.notes}<p class="alert-warn">{o.notes}</p>{/if}
		{#if o.cancelReason}<p class="alert-error">Motivo: {o.cancelReason}</p>{/if}

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
							<span>Promoção</span><span>−<Money cents={item.discountCents} /></span>
						</div>
					{/if}
					{#if item.allergyFlag}<p class="text-sm font-bold text-bad">⚠ Alergia / atenção</p>{/if}
					{#if item.note}<p class="text-sm italic">“{item.note}”</p>{/if}
				</div>
			{/each}
			<dl class="space-y-1 p-3 text-sm">
				<div class="flex justify-between">
					<dt>Subtotal</dt>
					<dd><Money cents={o.subtotalCents} /></dd>
				</div>
				{#if o.discountCents}<div class="flex justify-between">
						<dt>Desconto{o.offerName ? ` · ${o.offerName}` : ''}</dt>
						<dd>−<Money cents={o.discountCents} /></dd>
					</div>{/if}
				{#if o.deliveryFeeCents}<div class="flex justify-between">
						<dt>Entrega</dt>
						<dd><Money cents={o.deliveryFeeCents} /></dd>
					</div>{/if}
				<div class="flex justify-between text-base font-bold">
					<dt>Total</dt>
					<dd><Money cents={o.totalCents} /></dd>
				</div>
			</dl>
		</div>

		{#if o.address}
			<div class="card p-3 text-sm">
				<h2 class="mb-1 font-semibold">Endereço</h2>
				<p>{o.address.recipient}</p>
				<p>
					{o.address.street}, {o.address.number}
					{o.address.complement ?? ''} · {o.address.neighborhood}
				</p>
				<p>{o.address.city}/{o.address.state} · CEP {o.address.cep}</p>
				{#if o.address.instructions}<p class="text-muted">{o.address.instructions}</p>{/if}
			</div>
		{/if}

		<div class="card p-3">
			<h2 class="mb-2 font-semibold">Histórico</h2>
			{#if o.pushFailed}<p class="mb-2 text-sm text-bad">
					Aviso não entregue: o celular do cliente não recebeu a notificação de pronto.
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
		<div class="space-y-2 card p-3">
			<h2 class="font-semibold">Ações</h2>
			<FormError message={form?.error} />
			{#each next as to (to)}
				{#if requiresReason(to)}
					{#if reasonFor === to}
						<form
							method="POST"
							action="?/transition"
							use:enhance={() =>
								async ({ update }) => {
									await update();
									reasonFor = null;
								}}
							class="space-y-2"
						>
							<input type="hidden" name="to" value={to} />
							<input type="hidden" name="version" value={o.version} />
							<input class="field" name="reason" placeholder="Motivo (obrigatório)" required />
							<div class="flex gap-2">
								<button
									type="button"
									class="btn-secondary flex-1"
									onclick={() => (reasonFor = null)}>Voltar</button
								>
								<button class="btn-danger flex-1">{actionLabel[to]}</button>
							</div>
						</form>
					{:else}
						<button class="btn-secondary w-full text-bad" onclick={() => (reasonFor = to)}
							>{actionLabel[to]}</button
						>
					{/if}
				{:else}
					<form method="POST" action="?/transition" use:enhance>
						<input type="hidden" name="to" value={to} />
						<input type="hidden" name="version" value={o.version} />
						<button class="btn-primary w-full">{actionLabel[to]}</button>
					</form>
				{/if}
			{:else}
				<p class="text-sm text-muted">Nenhuma ação disponível.</p>
			{/each}
		</div>

		<div class="space-y-2 card p-3">
			<h2 class="font-semibold">Pagamentos</h2>
			{#each o.tenders as t (t.id)}
				<div class="text-sm">
					<div class="flex justify-between">
						<span>{METHOD_LABEL_PT[t.method as keyof typeof METHOD_LABEL_PT] ?? t.method}</span
						><Money cents={t.amountCents} />
					</div>
					<div class="flex justify-between text-xs text-muted">
						<span
							>{t.providerReference ?? ''} {t.recordedByName ? `· ${t.recordedByName}` : ''}</span
						>
						<PaymentBadge status={t.status} />
					</div>
					{#if manager && t.status === 'paid' && t.provider === 'manual'}
						{#if refunding === t.id}
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
								<input type="hidden" name="tenderId" value={t.id} />
								<input class="field" name="reason" placeholder="Motivo do estorno" required />
								<button class="btn-danger min-h-9 w-full text-sm">Confirmar estorno</button>
							</form>
						{:else}
							<button class="btn-ghost min-h-8 text-xs text-bad" onclick={() => (refunding = t.id)}
								>Estornar</button
							>
						{/if}
					{/if}
				</div>
			{:else}
				<p class="text-sm text-muted">Nenhum pagamento registrado.</p>
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
						: ''}">{o.paymentPlan === 'pix_key' ? 'Registrar Pix recebido' : 'Receber pagamento'}</a
				>
			{/if}
		</div>
	</aside>
</main>
