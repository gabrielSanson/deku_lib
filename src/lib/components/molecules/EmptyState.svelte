<script lang="ts">
	// Shown when a list has nothing in it. Says what is missing and, when there is one, what to do next.
	import type { Snippet } from 'svelte';

	let { title, text, action }: { title: string; text?: string; action?: Snippet } = $props();
</script>

<div class="rounded-(--radius-card) border border-dashed border-line p-8 text-center">
	<p class="font-display text-lg font-extrabold text-ink">{title}</p>
	{#if text}<p class="mt-1 text-sm text-muted">{text}</p>{/if}
	{#if action}<div class="mt-4 flex justify-center">{@render action()}</div>{/if}
</div>
