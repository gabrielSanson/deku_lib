<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
</script>

<svelte:head
	><title>{t('courier.title', { shop: data.shop })}</title><meta
		name="robots"
		content="noindex"
	/></svelte:head
>

<main class="mx-auto max-w-lg space-y-4 p-4">
	<h1 class="page-title">{t('courier.hello', { name: data.courier.name })}</h1>
	<p class="text-sm text-muted">{t('courier.intro', { shop: data.shop })}</p>
	{#if form && 'error' in form}<p class="font-semibold text-red-700" role="alert">
			{form.error}
		</p>{/if}
	{#each data.runs as r (r.id)}
		<section class="space-y-3 card p-4">
			{#if !r.leftAt}
				<form method="POST" action="?/left" use:enhance>
					<input type="hidden" name="runId" value={r.id} />
					<button class="btn-primary w-full">{t('courier.left', { n: r.orders.length })}</button>
				</form>
			{:else}
				<p class="text-sm text-muted">{t('dispatch.leftAt', { time: formatTime(r.leftAt) })}</p>
			{/if}
			<ol class="space-y-3">
				{#each r.orders as o (o.id)}
					<li class="space-y-1 rounded-lg border border-line p-3">
						<p class="font-semibold">#{o.orderNumber} · {o.recipient}</p>
						<p class="text-sm">
							{o.street}, {o.number}{o.complement ? ` – ${o.complement}` : ''} · {o.neighborhood}
						</p>
						{#if o.instructions}<p class="text-sm text-muted">{o.instructions}</p>{/if}
						<div class="flex flex-wrap gap-2 pt-1">
							<a class="btn-secondary min-h-11" href={o.map} target="_blank" rel="noopener"
								>{t('dispatch.map')}</a
							>
							{#if o.deliveredAt}
								<span class="self-center font-semibold text-ok"
									>✓ {t('courier.deliveredAt', { time: formatTime(o.deliveredAt) })}</span
								>
							{:else if r.leftAt}
								<form method="POST" action="?/delivered" use:enhance>
									<input type="hidden" name="orderId" value={o.id} />
									<button class="btn-primary min-h-11">{t('dispatch.delivered')}</button>
								</form>
							{/if}
						</div>
					</li>
				{/each}
			</ol>
		</section>
	{:else}
		<p class="text-muted">{t('courier.none')}</p>
	{/each}
	<p class="text-xs text-muted">{t('dispatch.noCash')}</p>
</main>
