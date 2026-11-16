<script lang="ts">
	let { children } = $props();
</script>

<div class="min-h-dvh bg-surface text-ink">
	<header class="mx-auto flex max-w-4xl items-center justify-between p-4">
		<a href="/conheca" class="text-lg font-black">Deku Lib</a>
		<nav class="flex gap-3 text-sm">
			<a class="underline" href="/criar-loja">Criar minha loja</a>
			<a class="underline" href="/staff/login">Entrar</a>
		</nav>
	</header>
	<main class="mx-auto max-w-4xl px-4 pb-16">
		{@render children()}
	</main>
	<footer class="mx-auto flex max-w-4xl flex-wrap gap-4 px-4 pb-8 text-xs text-muted">
		<a href="/termos">Termos de uso</a>
		<a href="/privacidade-plataforma">Privacidade</a>
		<a href="/dpa">Tratamento de dados (DPA)</a>
	</footer>
</div>
