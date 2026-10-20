<script lang="ts">
	import { page } from '$app/state';

	let { data } = $props();
	const query = $derived(page.url.searchParams.toString());
</script>

<svelte:head><title>Simulador de cartão</title></svelte:head>

<main class="mx-auto max-w-md space-y-4 p-6">
	<p class="alert-warn">Simulador local. Nenhum cartão é cobrado.</p>
	<h1 class="text-xl font-bold">Pagamento com cartão (teste)</h1>
	<p class="text-sm break-all text-muted">Pagamento {data.payment}</p>
	<form method="POST" class="flex gap-2">
		<button class="btn-primary flex-1" formaction="?/approve&{query}">Aprovar</button>
		<button class="btn-secondary flex-1" formaction="?/decline&{query}">Recusar</button>
	</form>
</main>
