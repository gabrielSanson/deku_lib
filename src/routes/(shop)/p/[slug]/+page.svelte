<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>{data.page.title} · {data.shopName}</title></svelte:head>

<article class="space-y-4 py-6">
	<h1 class="text-2xl font-black">{data.page.title}</h1>
	{#each data.page.blocks as block, i (i)}
		{#if block.type === 'heading'}
			<h2 class="text-lg font-bold">{block.text}</h2>
		{:else}
			<p class="whitespace-pre-line text-stone-700">{block.text}</p>
		{/if}
	{/each}
</article>
