<script lang="ts">
	import DocText from '#lib/components/organisms/DocText.svelte';

	let { data } = $props();
</script>

<svelte:head><title>{data.article.title} · Ajuda</title></svelte:head>

<main class="mx-auto max-w-2xl space-y-4 px-4 py-8">
	<a class="text-sm underline" href="/ajuda">← Ajuda</a>
	<DocText source={data.article.source} />
	{#if data.support}
		<p class="text-sm">
			Ainda com dúvida?
			<a class="underline" href={data.support} target="_blank" rel="noopener noreferrer">
				Fale com o suporte no WhatsApp
			</a>
		</p>
	{/if}
</main>
