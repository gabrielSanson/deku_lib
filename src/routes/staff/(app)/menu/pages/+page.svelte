<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';

	let { data, form } = $props();
</script>

<svelte:head><title>Páginas do site · Equipe</title></svelte:head>

<main class="mx-auto max-w-3xl space-y-4 p-4">
	<a class="btn-ghost min-h-9" href="/staff/menu/edit">← Cardápio</a>
	<h1 class="text-xl font-bold">Páginas do site</h1>
	<p class="text-sm text-muted">
		Texto simples. Deixe uma linha em branco entre parágrafos. Comece a linha com "## " para um
		título.
	</p>
	<FormError message={form?.error} />

	{#each data.pages as p (p.slug)}
		<form
			method="POST"
			action="?/save"
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
			class="space-y-2 card p-4"
		>
			<input type="hidden" name="slug" value={p.slug} />
			<div class="flex items-center justify-between gap-2">
				<input class="field font-semibold" name="title" value={p.title} required maxlength="120" />
				<a class="btn-ghost min-h-9 text-sm whitespace-nowrap" href="/p/{p.slug}" target="_blank"
					>Ver ↗</a
				>
			</div>
			<textarea class="field min-h-36" name="text" aria-label="Texto de {p.title}"
				>{p.text}</textarea
			>
			<div class="flex items-center justify-between">
				<label class="flex min-h-11 items-center gap-2 text-sm"
					><input type="checkbox" class="size-5" name="published" checked={p.published} /> Publicada</label
				>
				<button class="btn-primary">Salvar</button>
			</div>
			{#if form?.ok === p.slug}<p class="alert-ok">Salvo.</p>{/if}
		</form>
	{/each}
</main>
