<script lang="ts">
	import { formatBRL } from '#lib/domain/money.ts';
	import { formatDateTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
	const r = $derived(data.run);
</script>

<svelte:head><title>{t('dispatch.route')}</title></svelte:head>

<main class="mx-auto max-w-2xl space-y-3 p-4 print:p-0">
	<header class="flex flex-wrap items-baseline gap-2">
		<h1 class="page-title">{t('dispatch.routeFor', { name: r.courier })}</h1>
		<span class="text-sm text-muted">{formatDateTime(r.createdAt)}</span>
		<button class="ml-auto btn-secondary print:hidden" onclick={() => window.print()}
			>{t('dispatch.print')}</button
		>
	</header>
	<ol class="list-decimal space-y-3 pl-6">
		{#each r.orders as o (o.id)}
			<li class="text-sm">
				<p class="font-semibold">#{o.orderNumber} · {o.recipient} · {formatBRL(o.totalCents)}</p>
				<p>
					{o.street}, {o.number}{o.complement ? ` – ${o.complement}` : ''} · {o.neighborhood} · {o.city}/{o.state}
					· {o.cep}
				</p>
				{#if o.instructions}<p class="text-muted">{o.instructions}</p>{/if}
				<a class="underline print:hidden" href={o.map} target="_blank" rel="noopener"
					>{t('dispatch.map')}</a
				>
			</li>
		{/each}
	</ol>
	<p class="text-xs text-muted">{t('dispatch.noCash')}</p>
</main>
