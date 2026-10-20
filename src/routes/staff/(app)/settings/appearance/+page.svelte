<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';

	let { data, form } = $props();
	const look = $derived(data.look);

	// Follows the saved colours, and the colour pickers edit it locally until saved.
	let colors = $derived({
		primary: look.colors.primary ?? data.defaults.primary,
		dark: look.colors.dark ?? data.defaults.dark,
		background: look.colors.background ?? data.defaults.background
	});

	const colorFields = [
		{ key: 'primary', label: 'Cor principal', hint: 'Botões, destaques e preços em evidência.' },
		{ key: 'dark', label: 'Cor escura', hint: 'Topo, rodapé e o painel do carrinho.' },
		{ key: 'background', label: 'Fundo da página', hint: 'Atrás do cardápio.' }
	] as const;
	const imageFields = [
		{
			key: 'logo',
			label: 'Símbolo',
			hint: 'No topo e onde falta foto. PNG com fundo transparente.'
		},
		{ key: 'wordmark', label: 'Nome em letras', hint: 'Ao lado do símbolo, no topo.' },
		{
			key: 'heroLogo',
			label: 'Logo grande',
			hint: 'No destaque da página inicial, quando não há foto de produto.'
		},
		{
			key: 'icon',
			label: 'Ícone do app',
			hint: 'Aba do navegador e atalho no celular. Quadrado, 512×512 px.'
		}
	] as const;
	const keep =
		() =>
		async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
</script>

<svelte:head><title>Aparência · Configurações</title></svelte:head>

<div class="space-y-4">
	<header class="space-y-1">
		<h1 class="text-xl font-bold">Aparência do site</h1>
		<p class="text-sm text-muted">
			Cores, logos e ícone que o cliente vê. Os textos ficam em
			<a class="underline" href="/staff/settings/texts">Textos</a>; produtos, fotos, adicionais e
			ingredientes ficam em <a class="underline" href="/staff/menu/edit">Editar cardápio</a>.
		</p>
	</header>

	<FormError message={form?.error} />
	{#if form?.ok}<p class="alert-ok">{form.ok}</p>{/if}

	<!-- Preview of the shop header with the chosen colours -->
	<div class="overflow-hidden rounded-xl ring-1 ring-line" aria-hidden="true">
		<div class="flex items-center gap-3 px-4 py-3" style="background:{colors.dark}">
			<img src={look.images.logo} alt="" class="h-10 w-auto" />
			<img src={look.images.wordmark} alt="" class="h-6 w-auto" />
			<span
				class="ml-auto rounded-full px-4 py-2 text-sm font-bold text-black"
				style="background:{colors.primary}">Pedir agora</span
			>
		</div>
		<div class="p-4 text-sm" style="background:{colors.background}">Cardápio</div>
	</div>

	<form method="POST" action="?/colors" class="space-y-4 card p-4" use:enhance={keep}>
		<h2 class="font-semibold">Cores</h2>
		<div class="grid gap-4 sm:grid-cols-3">
			{#each colorFields as c (c.key)}
				<div>
					<label class="label" for="c-{c.key}">{c.label}</label>
					<div class="flex items-center gap-2">
						<input
							id="c-{c.key}"
							type="color"
							name={c.key}
							class="h-11 w-14 cursor-pointer rounded border border-line bg-surface"
							bind:value={colors[c.key]}
						/>
						<code class="text-sm">{colors[c.key]}</code>
					</div>
					<p class="mt-1 text-xs text-muted">{c.hint}</p>
				</div>
			{/each}
		</div>
		<div class="flex flex-wrap gap-2">
			<button class="btn-primary">Salvar cores</button>
			<button class="btn-ghost" formaction="?/resetColors">Voltar às cores padrão</button>
		</div>
	</form>

	<section class="space-y-3 card p-4">
		<h2 class="font-semibold">Logos e ícone</h2>
		<p class="text-sm text-muted">JPG, PNG ou WebP de até 5 MB.</p>
		<ul class="divide-y divide-line">
			{#each imageFields as f (f.key)}
				<li class="flex flex-wrap items-center gap-4 py-4">
					<div class="grid size-20 shrink-0 place-items-center rounded-lg bg-night p-2">
						<img src={look.images[f.key]} alt="" class="size-full object-contain" />
					</div>
					<div class="min-w-48 flex-1">
						<p class="font-medium">
							{f.label}
							{#if !look.custom[f.key]}<span class="text-xs font-normal text-muted">(padrão)</span
								>{/if}
						</p>
						<p class="text-xs text-muted">{f.hint}</p>
					</div>
					<form
						method="POST"
						action="?/upload"
						enctype="multipart/form-data"
						class="flex flex-wrap items-center gap-2"
						use:enhance
					>
						<input type="hidden" name="image" value={f.key} />
						<input
							type="file"
							name="file"
							accept="image/png,image/jpeg,image/webp"
							class="max-w-56 text-sm"
							required
							aria-label="Nova imagem: {f.label}"
						/>
						<button class="btn-secondary">Enviar</button>
						{#if look.custom[f.key]}
							<button class="btn-ghost" formaction="?/resetImage" formnovalidate
								>Usar o padrão</button
							>
						{/if}
					</form>
				</li>
			{/each}
		</ul>
	</section>
</div>
