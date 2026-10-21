<script lang="ts">
	import Money from '#lib/components/atoms/Money.svelte';
	import PaymentBadge from '#lib/components/atoms/PaymentBadge.svelte';
	import { METHOD_LABEL_PT } from '#lib/domain/tender-labels.ts';

	let { data } = $props();
</script>

<svelte:head><title>Pedido #{data.order.orderNumber} enviado</title></svelte:head>

<main class="mx-auto max-w-md space-y-5 p-6 text-center">
	<p class="text-sm font-medium text-muted">Pedido enviado para a cozinha</p>
	<!-- The order number is the pickup code: read it out, the customer can photograph it. -->
	<div>
		<p class="text-2xl font-bold">Senha</p>
		<p class="text-8xl font-black tabular-nums" data-testid="pickup-code">
			{data.order.orderNumber}
		</p>
	</div>
	{#if data.order.customerLabel}<p class="text-xl">{data.order.customerLabel}</p>{/if}
	{#if data.order.tableLabel}<p class="text-muted">Mesa {data.order.tableLabel}</p>{/if}
	<div class="space-y-2 card p-4 text-left">
		<div class="flex justify-between">
			<span>Total</span><Money cents={data.order.totalCents} class="font-bold" />
		</div>
		<div class="flex justify-between">
			<span>Pagamento</span><PaymentBadge status={data.order.paymentStatus} />
		</div>
		{#each data.order.tenders as t (t.id)}
			<div class="flex justify-between text-sm text-muted">
				<span
					>{METHOD_LABEL_PT[t.method as keyof typeof METHOD_LABEL_PT] ??
						t.method}{t.providerReference ? ` · ${t.providerReference}` : ''}</span
				>
				<Money cents={t.amountCents} />
			</div>
			{#if t.changeCents}<div class="flex justify-between text-sm">
					<span>Troco</span><Money cents={t.changeCents} />
				</div>{/if}
		{/each}
	</div>
	<a class="btn-primary w-full text-lg" href="/staff/pos">Nova venda</a>
	<a class="btn-ghost w-full" href="/staff/orders/{data.order.id}">Ver detalhes do pedido</a>
</main>
