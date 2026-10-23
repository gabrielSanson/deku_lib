<script lang="ts">
	// A product (or campaign, or category) photo at a fixed ratio, with a quiet
	// placeholder (the shop preset's product icon) when there is no photo yet.
	import { page } from '$app/state';
	import Icon from '#lib/components/atoms/Icon.svelte';

	let {
		src,
		alt = '',
		class: className = 'aspect-[4/3] w-full rounded-(--radius-control)',
		tone = 'cream'
	}: {
		src: string | null | undefined;
		alt?: string;
		class?: string;
		tone?: 'cream' | 'brand' | 'night';
	} = $props();
	const tones = {
		cream: 'bg-cream text-stone-300',
		brand: 'bg-brand-tint text-brand-600',
		night: 'bg-night-2 text-stone-600'
	};
</script>

{#if src}
	<img {src} {alt} loading="lazy" decoding="async" class="object-cover {className}" />
{:else}
	<div
		class="grid place-items-center {tones[tone]} {className}"
		role={alt ? 'img' : undefined}
		aria-label={alt || undefined}
	>
		<Icon
			name={page.data.branding?.productIcon ?? 'grid'}
			class="size-1/3 max-h-12 max-w-12"
			strokeWidth={1.5}
		/>
	</div>
{/if}
