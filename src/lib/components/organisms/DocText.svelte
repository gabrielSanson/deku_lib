<script lang="ts">
	// Shows a legal or help text parsed by parseDocText. Plain text only, never HTML.
	import { parseDocText } from '#lib/domain/doc-text.ts';

	let { source }: { source: string } = $props();
	const blocks = $derived(parseDocText(source));
</script>

<article class="max-w-2xl space-y-3 py-6">
	{#each blocks as b, i (i)}
		{#if b.type === 'h1'}
			<h1 class="text-2xl font-black">{b.text}</h1>
		{:else if b.type === 'h2'}
			<h2 class="pt-2 text-lg font-bold">{b.text}</h2>
		{:else if b.type === 'p'}
			<p>{b.text}</p>
		{:else if b.type === 'ul'}
			<ul class="list-disc space-y-1 pl-5">
				{#each b.items as item, j (j)}<li>{item}</li>{/each}
			</ul>
		{/if}
	{/each}
</article>
