<script lang="ts">
	// The ⋮ menu at the end of a table row. Items are rendered by the caller
	// (usually small forms), so actions stay plain form posts.
	import type { Snippet } from 'svelte';
	import Icon from '#lib/components/atoms/Icon.svelte';

	let { label = 'Mais ações', children }: { label?: string; children: Snippet } = $props();
	let open = $state(false);
	let root: HTMLElement;
</script>

<svelte:window
	onclick={(e) => open && !root.contains(e.target as Node) && (open = false)}
	onkeydown={(e) => e.key === 'Escape' && (open = false)}
/>

<div class="relative inline-block" bind:this={root}>
	<button
		type="button"
		class="btn-ghost min-h-10 px-2"
		aria-label={label}
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		<Icon name="dots" strokeWidth={3} />
	</button>
	{#if open}
		<div
			role="menu"
			tabindex="-1"
			class="absolute right-0 z-30 mt-1 min-w-44 card p-1 text-left [&_a]:block [&_a]:rounded-lg [&_a]:px-3 [&_a]:py-2 [&_a]:text-sm [&_a:hover]:bg-quiet [&_button]:w-full [&_button]:justify-start [&_button]:rounded-lg [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_button:hover]:bg-quiet"
		>
			{@render children()}
		</div>
	{/if}
</div>
