<script lang="ts">
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
</script>

<div class="mx-auto max-w-md space-y-4 py-10 text-center">
	<p class={data.ok ? 'alert-ok' : 'alert-error'} role="status">
		{data.ok ? t('marketing.optedOut') : t('marketing.optOutBad')}
	</p>
	<a class="btn-ghost" href="/cardapio">{t('menu.title')}</a>
</div>
