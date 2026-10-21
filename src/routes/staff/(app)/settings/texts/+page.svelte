<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { placeholders } from '#lib/texts/catalog.ts';

	let { data, form } = $props();
	let search = $state('');
	const q = $derived(search.trim().toLowerCase());
	const matches = (x: { label: string; value: string; default: string }) =>
		!q || [x.label, x.value, x.default].some((s) => s.toLowerCase().includes(q));
	const changedCount = $derived(
		data.groups.flatMap((g) => g.texts).filter((x) => x.changed).length
	);
</script>

<svelte:head><title>Textos · Configurações</title></svelte:head>

<div class="space-y-4">
	<header class="space-y-1">
		<h1 class="page-title">Textos do site</h1>
		<p class="text-sm text-muted">
			Tudo o que o cliente lê no site: avisos, botões, títulos e mensagens de erro. Deixe um texto
			vazio para voltar ao padrão. Palavras entre chaves, como <code>{'{name}'}</code>, são
			preenchidas pelo site e precisam continuar no texto.
			{#if changedCount}<strong>{changedCount} alterado{changedCount === 1 ? '' : 's'}.</strong
				>{/if}
		</p>
	</header>

	<input class="field" type="search" placeholder="Procurar texto" bind:value={search} />

	<form
		method="POST"
		action="?/save"
		class="space-y-3"
		use:enhance={() =>
			async ({ update }) =>
				update({ reset: false })}
	>
		{#each data.groups as g (g.group)}
			{@const shown = g.texts.filter(matches)}
			{#if shown.length}
				<details class="card" open={q ? true : undefined}>
					<summary
						class="flex min-h-12 cursor-pointer items-center justify-between px-4 font-semibold"
					>
						{g.title}
						<span class="text-sm font-normal text-muted"
							>{shown.length} texto{shown.length === 1 ? '' : 's'}</span
						>
					</summary>
					<div class="space-y-4 border-t border-line p-4">
						{#each g.texts as x (x.key)}
							{@const vars = placeholders(x.default)}
							<div class={matches(x) ? '' : 'hidden'}>
								<label class="label flex items-center justify-between gap-2" for={x.key}>
									<span>{x.label}</span>
									{#if x.changed}<span class="rounded bg-brand-100 px-1.5 text-xs text-brand-700"
											>alterado</span
										>{/if}
								</label>
								{#if x.default.length > 60 || x.default.includes('\n')}
									<textarea
										id={x.key}
										name="t:{x.key}"
										class="field"
										rows="3"
										maxlength="1000"
										placeholder={x.default}
										value={x.changed ? x.value : ''}></textarea>
								{:else}
									<input
										id={x.key}
										name="t:{x.key}"
										class="field"
										maxlength="1000"
										placeholder={x.default}
										value={x.changed ? x.value : ''}
									/>
								{/if}
								{#if vars.length}<p class="mt-1 text-xs text-muted">
										Precisa ter: {vars.map((v) => `{${v}}`).join(', ')}
									</p>{/if}
							</div>
						{/each}
					</div>
				</details>
			{/if}
		{/each}
		<FormError message={form?.error} />
		{#if form?.ok}<p class="alert-ok">Salvo. O site já mostra os textos novos.</p>{/if}
		<div class="sticky bottom-0 bg-canvas py-3">
			<button class="btn-primary w-full sm:w-auto">Salvar textos</button>
		</div>
	</form>
</div>
