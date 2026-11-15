<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import Money from '#lib/components/atoms/Money.svelte';
	import { cart } from '#lib/client/cart.svelte.ts';
	import { rebuildOrder } from '#lib/domain/reorder.ts';
	import { formatTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
	let copied = $state(false);
	let now = $state(Date.now());

	onMount(() => {
		if (data.expired) return;
		const poll = setInterval(() => invalidate('app:payment'), 4000);
		const tick = setInterval(() => (now = Date.now()), 1000);
		return () => {
			clearInterval(poll);
			clearInterval(tick);
		};
	});
	const remaining = $derived(
		!data.expired && data.expiresAt
			? Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - now) / 1000))
			: null
	);
	// The order was cancelled unpaid: put what is still on the menu back in the cart.
	function reorder() {
		if (!data.expired) return;
		const { lines } = rebuildOrder(
			data.items,
			data.catalog.products,
			new Set(data.soldOut),
			new Set(data.missingIngredients)
		);
		for (const l of lines) cart.add(l.product, l.quantity, l.options, l.note);
		if (lines.length) cart.panelOpen = true;
	}
	async function copy() {
		if (data.expired || !data.pixCode) return;
		await navigator.clipboard.writeText(data.pixCode);
		copied = true;
		setTimeout(() => (copied = false), 2500);
	}
</script>

<svelte:head><title>{t('payment.pageTitle', { number: data.orderNumber })}</title></svelte:head>

<section class="mx-auto max-w-md space-y-5 py-6 text-center">
	<header class="space-y-1">
		<p class="section-label">{t('payment.order', { number: data.orderNumber })}</p>
		<h1 class="page-title">
			{t('payment.total')}
			<Money cents={data.totalCents} />
		</h1>
	</header>

	{#if data.expired}
		<p class="alert-error">{t('payment.expired')}</p>
		<button class="btn-primary w-full" onclick={reorder}>{t('payment.reorder')}</button>
		<a class="btn-ghost w-full" href="/cardapio">{t('errors.backToMenu')}</a>
	{:else if data.tenderStatus === 'cancelled' || data.tenderStatus === 'failed' || remaining === 0}
		<p class="alert-error">{t('payment.failed')}</p>
		<a class="btn-primary" href="/cardapio">{t('errors.backToMenu')}</a>
	{:else if data.pixSvg}
		<div class="space-y-4 card p-5">
			<p class="text-muted">
				{data.shopPix ? t('payment.instructions.shop') : t('payment.instructions.auto')}
			</p>
			<div class="mx-auto w-60 rounded-xl border border-line bg-white p-2">
				<!-- QR generated on our server from the provider's Pix payload -->
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- SVG built on our server by the qrcode library -->
				{@html data.pixSvg}
			</div>
			<button class="btn-primary w-full" onclick={copy}
				>{copied ? t('payment.copied') : t('payment.copy')}</button
			>
			{#if data.payBy}
				<p class="mx-auto pill bg-quiet text-muted">
					{t('payment.deadline', { time: formatTime(data.payBy) })}
				</p>
			{/if}
			{#if remaining !== null}
				<p class="mx-auto pill bg-quiet text-muted" aria-live="polite">
					{t('payment.expires', {
						time: `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
					})}
				</p>
			{/if}
		</div>
		<p class="flex items-center justify-center gap-2 text-sm text-muted">
			<span class="size-2 animate-pulse rounded-full bg-brand-500"></span>
			{data.shopPix ? t('payment.waiting.shop') : t('payment.waiting.auto')}
		</p>
		{#if data.shopPix}
			<a class="btn-ghost w-full" href="/orders/{data.token}">{t('payment.track')}</a>
		{/if}
	{:else if data.redirectUrl}
		<a class="btn-primary w-full" href={data.redirectUrl}>{t('payment.card')}</a>
	{/if}

	{#if data.devApproveUrl}
		<form
			method="POST"
			action={data.devApproveUrl}
			class="rounded-lg border border-dashed border-amber-400 p-3 text-sm"
		>
			<p class="mb-2 text-warn">Ambiente de desenvolvimento: simular o webhook do provedor.</p>
			<button class="btn-secondary">Simular pagamento aprovado</button>
		</form>
	{/if}
</section>
