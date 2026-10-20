<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import Money from '#lib/components/Money.svelte';

	let { data } = $props();
	let copied = $state(false);
	let now = $state(Date.now());

	onMount(() => {
		const poll = setInterval(() => invalidate('app:payment'), 4000);
		const tick = setInterval(() => (now = Date.now()), 1000);
		return () => {
			clearInterval(poll);
			clearInterval(tick);
		};
	});
	const remaining = $derived(
		data.expiresAt
			? Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - now) / 1000))
			: null
	);
	async function copy() {
		if (!data.pixCode) return;
		await navigator.clipboard.writeText(data.pixCode);
		copied = true;
		setTimeout(() => (copied = false), 2500);
	}
</script>

<svelte:head><title>Pagamento do pedido #{data.orderNumber}</title></svelte:head>

<section class="space-y-5 py-6 text-center">
	<h1 class="text-2xl font-black">Pedido #{data.orderNumber}</h1>
	<p class="text-lg">Total: <Money cents={data.totalCents} class="font-bold" /></p>

	{#if data.tenderStatus === 'cancelled' || data.tenderStatus === 'failed' || remaining === 0}
		<p class="alert-error">O pagamento não foi concluído. Faça o pedido novamente.</p>
		<a class="btn-primary" href="/">Voltar ao cardápio</a>
	{:else if data.pixSvg}
		<p class="text-muted">Abra o app do seu banco e pague com Pix. A confirmação é automática.</p>
		<div class="mx-auto w-60 rounded-xl bg-white p-2">
			<!-- QR generated on our server from the provider's Pix payload -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- SVG built on our server by the qrcode library -->
			{@html data.pixSvg}
		</div>
		<button class="btn-secondary w-full" onclick={copy}
			>{copied ? 'Código copiado!' : 'Copiar código Pix (copia e cola)'}</button
		>
		{#if remaining !== null}
			<p class="text-sm text-muted" aria-live="polite">
				Expira em {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
			</p>
		{/if}
		<p class="flex items-center justify-center gap-2 text-sm text-muted">
			<span class="size-2 animate-pulse rounded-full bg-brand-500"></span> Aguardando confirmação do pagamento…
		</p>
	{:else if data.redirectUrl}
		<a class="btn-primary w-full" href={data.redirectUrl}>Ir para o pagamento com cartão</a>
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
