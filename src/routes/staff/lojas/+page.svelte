<script lang="ts">
	import StatusPill from '#lib/components/atoms/StatusPill.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
</script>

<svelte:head><title>{t('shops.tabTitle')}</title></svelte:head>

<main class="mx-auto max-w-lg space-y-4 p-4">
	<h1 class="page-title">{t('shops.title')}</h1>
	{#if !data.isMemberHere}
		<p class="alert-warn">{t('shops.notHere')}</p>
	{/if}
	{#if data.shops.length === 0}
		<p class="text-sm text-muted">{t('shops.none')}</p>
	{:else}
		<ul class="space-y-2">
			{#each data.shops as s (s.id)}
				<li class="flex items-center justify-between gap-3 card p-3">
					<div>
						<p class="font-bold">{s.name}</p>
						<p class="text-xs text-muted">{s.host ?? ''}</p>
					</div>
					{#if s.id === data.here}
						<a class="btn-secondary" href="/staff">{t('shops.open')}</a>
					{:else if s.host}
						<a class="btn-secondary" href="{data.protocol}//{s.host}/staff">{t('shops.open')}</a>
					{/if}
					{#if s.status === 'suspended'}
						<StatusPill tone="bad" label={t('shops.suspended')} />
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
	<form method="post" action="/staff/logout">
		<button class="btn-ghost">{t('shops.signOut')}</button>
	</form>
</main>
