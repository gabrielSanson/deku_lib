<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>Ajuda</title></svelte:head>

<main class="mx-auto max-w-2xl space-y-4 px-4 py-8">
	<h1 class="page-title">Ajuda</h1>
	<p class="text-sm text-muted">Guias curtos para configurar e usar a loja.</p>
	<ul class="grid gap-2 sm:grid-cols-2">
		{#each data.articles as a (a.slug)}
			<li>
				<a class="block card p-4 hover:border-brand-500" href="/ajuda/{a.slug}">
					<strong class="block">{a.title}</strong>
					<span class="text-sm text-muted">{a.summary}</span>
				</a>
			</li>
		{/each}
	</ul>
	{#if data.support}
		<a class="btn-secondary" href={data.support} target="_blank" rel="noopener noreferrer">
			Falar com o suporte no WhatsApp
		</a>
	{/if}
</main>
