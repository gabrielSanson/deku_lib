<script lang="ts">
	import FormError from '#lib/components/molecules/FormError.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';

	let { data, form } = $props();
</script>

<svelte:head><title>Entrar · Console da plataforma</title></svelte:head>

<form method="post" class="mx-auto mt-8 max-w-sm space-y-4 card p-6">
	<h1 class="page-title">Entrar no console</h1>
	{#if data.signedInElsewhere}
		<p class="alert-warn">Esta conta não é administradora da plataforma.</p>
	{/if}
	<FormError message={form?.error} />
	<TextField
		label="E-mail"
		name="email"
		type="email"
		autocomplete="username"
		value={form?.email ?? ''}
		required
	/>
	<TextField
		label="Senha"
		name="password"
		type="password"
		autocomplete="current-password"
		required
	/>
	<button class="btn-primary w-full">Entrar</button>
</form>
