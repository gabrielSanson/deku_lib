<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import Money from '#lib/components/Money.svelte';
	import PaymentBadge from '#lib/components/PaymentBadge.svelte';
	import { formatTime } from '#lib/domain/time.ts';

	let { data } = $props();
	const o = $derived(data.order);
	onMount(() => {
		const t = setInterval(
			() => document.visibilityState === 'visible' && invalidate('app:public-order'),
			10_000
		);
		return () => clearInterval(t);
	});

	const steps = $derived([
		{ key: 'new', label: 'Recebido' },
		{ key: 'confirmed', label: 'Confirmado' },
		{ key: 'preparing', label: 'Em preparo' },
		{
			key: 'ready',
			label: o.fulfillmentType === 'delivery' ? 'Saiu para entrega' : 'Pronto para retirar'
		},
		{ key: 'completed', label: 'Concluído' }
	]);
	const idx = $derived(steps.findIndex((s) => s.key === o.status));
	const isNew = $derived(page.url.searchParams.has('novo'));
</script>

<svelte:head
	><title>Pedido #{o.orderNumber}</title><meta name="robots" content="noindex" /></svelte:head
>

<section class="space-y-5 py-6">
	{#if isNew}<p class="alert-ok">Pedido enviado! Guarde este link para acompanhar.</p>{/if}
	<div class="text-center">
		<p class="text-sm text-muted">Pedido</p>
		<h1 class="text-5xl font-black tabular-nums">#{o.orderNumber}</h1>
		{#if o.promisedAt && idx >= 0 && idx < 4}<p class="mt-1 text-muted">
				Previsão: {formatTime(o.promisedAt)}
			</p>{/if}
	</div>

	{#if o.status === 'cancelled' || o.status === 'rejected'}
		<p class="alert-error text-center">
			Este pedido foi cancelado. Se você já pagou, o estorno é feito pela loja.
		</p>
	{:else}
		<ol class="space-y-2" aria-label="Andamento do pedido">
			{#each steps as s, i (s.key)}
				<li
					class="flex items-center gap-3 {i <= idx ? '' : 'opacity-40'}"
					aria-current={i === idx ? 'step' : undefined}
				>
					<span
						class="grid size-8 place-items-center rounded-full text-sm font-bold {i < idx
							? 'bg-ok text-white'
							: i === idx
								? 'bg-brand-600 text-white'
								: 'bg-stone-200'}">{i < idx ? '✓' : i + 1}</span
					>
					<span class={i === idx ? 'font-bold' : ''}>{s.label}</span>
				</li>
			{/each}
		</ol>
	{/if}

	<div class="space-y-1 card p-4 text-sm">
		{#each o.items as item, i (i)}
			<div class="flex justify-between gap-2">
				<span
					>{item.quantity}× {item.productName}{item.modifiers.length
						? ` (${item.modifiers.join(', ')})`
						: ''}</span
				><Money cents={item.lineTotalCents} />
			</div>
		{/each}
		{#if o.deliveryFeeCents}<div class="flex justify-between">
				<span>Entrega</span><Money cents={o.deliveryFeeCents} />
			</div>{/if}
		{#if o.discountCents}<div class="flex justify-between">
				<span>Desconto</span><span>−<Money cents={o.discountCents} /></span>
			</div>{/if}
		<div class="flex justify-between border-t border-line pt-2 text-base font-bold">
			<span>Total</span><Money cents={o.totalCents} />
		</div>
		<div class="flex justify-between pt-1">
			<span>Pagamento</span><PaymentBadge status={o.paymentStatus} />
		</div>
	</div>
	{#if o.paymentPlan === 'pix_key' && o.status === 'new' && o.paymentStatus !== 'paid'}
		<a class="btn-primary w-full" href="/checkout/payment/{page.params.token}">Pagar com Pix</a>
	{/if}
	<a class="btn-secondary w-full" href="/">Voltar ao cardápio</a>
</section>
