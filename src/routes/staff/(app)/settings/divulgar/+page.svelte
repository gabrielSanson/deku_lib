<script lang="ts">
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
	let copied = $state(false);
</script>

<svelte:head><title>{t('share.tabTitle')}</title></svelte:head>

<div class="space-y-6">
	<section class="space-y-3 card p-4">
		<h2 class="text-lg font-bold">{t('share.linkTitle')}</h2>
		<p class="text-sm text-muted">{t('share.linkIntro')}</p>
		<div class="flex flex-wrap items-center gap-2">
			<code class="block flex-1 rounded bg-line/40 p-2 text-sm break-all">{data.link}</code>
			<button
				type="button"
				class="btn-secondary"
				onclick={async () => {
					await navigator.clipboard?.writeText(data.link);
					copied = true;
				}}>{copied ? t('share.copied') : t('share.copy')}</button
			>
		</div>
	</section>

	<section class="space-y-3 card p-4">
		<h2 class="text-lg font-bold">{t('share.qrTitle')}</h2>
		<p class="text-sm text-muted">{t('share.qrIntro')}</p>
		<div class="w-56 rounded bg-white p-2">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- SVG made on the server by qrcode -->
			{@html data.qrSvg}
		</div>
		<a class="btn-primary" href="/staff/settings/divulgar/qr.png" download
			>{t('share.qrDownload')}</a
		>
	</section>

	<section class="space-y-3 card p-4">
		<h2 class="text-lg font-bold">{t('share.googleTitle')}</h2>
		<p class="text-sm whitespace-pre-line">{t('share.googleSteps', { link: data.link })}</p>
	</section>

	<section class="space-y-3 card p-4">
		<h2 class="text-lg font-bold">{t('share.instagramTitle')}</h2>
		<p class="text-sm whitespace-pre-line">{t('share.instagramSteps', { link: data.link })}</p>
	</section>
</div>
