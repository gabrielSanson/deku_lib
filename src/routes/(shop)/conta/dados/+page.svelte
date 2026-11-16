<script lang="ts">
	import { enhance } from '$app/forms';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const has = (k: string) => data.open.some((o) => o.kind === k);
</script>

<svelte:head><title>{t('privacy.title')}</title></svelte:head>

<div class="mx-auto max-w-xl space-y-4 py-4">
	<h1 class="page-title">{t('privacy.title')}</h1>
	<p class="text-sm text-muted">{t('privacy.intro')}</p>
	{#if form?.requested || data.open.length}
		<p class="alert-ok" role="status">{t('privacy.requested', { days: data.days })}</p>
	{/if}
	<form method="POST" action="?/request" use:enhance class="flex flex-col gap-2 card p-5">
		<button class="btn-secondary" name="kind" value="access" disabled={has('access')}
			>{t('privacy.access')}</button
		>
		<button class="btn-ghost text-bad" name="kind" value="delete" disabled={has('delete')}
			>{t('privacy.delete')}</button
		>
	</form>
</div>
