<script lang="ts">
	import { page } from '$app/state';
	import SegmentedTabs from '#lib/components/molecules/SegmentedTabs.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { children } = $props();
	const t = useTexts();
	const tabs = $derived([
		{ key: '/staff/estoque', label: t('stock.tab.items'), href: '/staff/estoque' },
		{
			key: '/staff/estoque/compras',
			label: t('stock.tab.purchases'),
			href: '/staff/estoque/compras'
		},
		{
			key: '/staff/estoque/contagem',
			label: t('stock.tab.count'),
			href: '/staff/estoque/contagem'
		},
		{ key: '/staff/estoque/perdas', label: t('stock.tab.waste'), href: '/staff/estoque/perdas' },
		{ key: '/staff/estoque/fichas', label: t('stock.tab.recipes'), href: '/staff/estoque/fichas' }
	]);
	const active = $derived(
		[...tabs].reverse().find((x) => page.url.pathname.startsWith(x.key))?.key ?? '/staff/estoque'
	);
</script>

<svelte:head><title>{t('stock.title')}</title></svelte:head>

<main class="space-y-4 p-4 sm:p-6">
	<h1 class="page-title">{t('stock.title')}</h1>
	<div class="overflow-x-auto">
		<SegmentedTabs label={t('stock.title')} {active} {tabs} />
	</div>
	{@render children()}
</main>
