<script lang="ts">
	import { page } from '$app/state';
	import { useTexts } from '#lib/texts/context.ts';

	const t = useTexts();
	const notFound = $derived(page.status === 404);
</script>

<svelte:head
	><title>{notFound ? t('errors.notFound.title') : t('errors.generic.title')}</title></svelte:head
>

<main class="grid min-h-dvh place-items-center bg-canvas p-4 text-center">
	<div class="max-w-sm space-y-4">
		<h1 class="font-display text-3xl">
			{notFound ? t('errors.notFound.title') : t('errors.generic.title')}
		</h1>
		<p class="text-muted">{notFound ? t('errors.notFound') : t('errors.generic')}</p>
		{#if notFound}
			<a class="btn-primary rounded-full px-6" href="/cardapio">{t('errors.backToMenu')}</a>
		{:else}
			<button class="btn-primary rounded-full px-6" onclick={() => location.reload()}
				>{t('errors.reload')}</button
			>
		{/if}
	</div>
</main>
