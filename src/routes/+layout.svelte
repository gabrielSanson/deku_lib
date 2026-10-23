<script lang="ts">
	import './layout.css';
	import UnsavedPrompt from '#lib/components/molecules/UnsavedPrompt.svelte';
	import { setTexts } from '#lib/texts/context.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	setTexts(() => data.texts);
	const iconType = $derived(data.branding.images.icon.endsWith('.png') ? 'image/png' : undefined);
</script>

<svelte:head>
	<link
		rel="icon"
		href={data.branding.custom.icon ? data.branding.images.icon : '/favicon.png'}
		type={iconType}
	/>
	<link
		rel="apple-touch-icon"
		href={data.branding.custom.icon ? data.branding.images.icon : '/apple-touch-icon.png'}
	/>
	{#if data.themeCss}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- built on the server from validated hex colours -->
		{@html `<style>${data.themeCss}</style>`}
	{/if}
</svelte:head>

{@render children()}
<UnsavedPrompt />
