<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDateTime } from '#lib/domain/time.ts';

	let { data } = $props();
	const label = { web: 'Servidor', worker: 'Tarefas', client: 'Navegador' } as const;
</script>

<svelte:head><title>Erros</title></svelte:head>

<div class="space-y-4">
	<h1 class="text-2xl font-black">Erros</h1>
	<p class="text-sm text-muted">
		Cada linha é um problema, agrupado; o número conta quantas vezes aconteceu. Apague depois de
		corrigir: se voltar, aparece de novo.
	</p>
	<nav class="flex flex-wrap gap-2 text-sm">
		<a class="chip {data.where === null ? 'chip-active' : ''}" href="?">Todos</a>
		{#each Object.entries(label) as [k, v] (k)}
			<a class="chip {data.where === k ? 'chip-active' : ''}" href="?onde={k}">{v}</a>
		{/each}
	</nav>
	{#if data.errors.length === 0}
		<p class="text-sm text-muted">Nenhum erro registrado.</p>
	{:else}
		<ul class="space-y-2">
			{#each data.errors as e (e.id)}
				<li class="space-y-1 card p-3 text-sm">
					<div class="flex flex-wrap items-baseline gap-2">
						<strong class="flex-1 break-words">{e.message}</strong>
						<span class="text-muted">{e.count}×</span>
					</div>
					<p class="text-xs text-muted">
						{label[e.where]} · {e.route ?? '—'} · {e.shopName ?? 'sem loja'} · primeira vez {formatDateTime(
							e.firstAt
						)} · última {formatDateTime(e.at)}
						{#if e.requestId}· pedido {e.requestId}{/if}
					</p>
					{#if e.stack}
						<details>
							<summary class="cursor-pointer text-xs">Detalhes</summary>
							<pre class="overflow-x-auto text-xs whitespace-pre-wrap">{e.stack}</pre>
						</details>
					{/if}
					<form method="POST" action="?/clear" use:enhance>
						<input type="hidden" name="id" value={e.id} />
						<button class="btn-ghost text-xs">Apagar</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</div>
