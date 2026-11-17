<script lang="ts">
	let { data, children } = $props();
</script>

<div class="min-h-dvh bg-surface text-ink">
	<header class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 p-4">
		<a href="/plataforma" class="text-lg font-black">Console da plataforma</a>
		{#if data.admin}
			<nav class="flex items-center gap-3 text-sm">
				<a class="underline" href="/plataforma">Lojas</a>
				<a class="underline" href="/plataforma/erros">Erros</a>
				<a class="underline" href="/plataforma/configuracoes">Configurações</a>
				<form method="post" action="/plataforma/sair">
					<button class="underline">Sair</button>
				</form>
			</nav>
		{/if}
	</header>
	<main class="mx-auto max-w-5xl px-4 pb-16">
		{@render children()}
	</main>
</div>
