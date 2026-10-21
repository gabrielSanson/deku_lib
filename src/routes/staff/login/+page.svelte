<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';

	let { data, form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Entrar · Equipe</title></svelte:head>

<main class="flex min-h-dvh flex-col items-center justify-center bg-night p-4">
	<img src="/brand/deku-logo.png" alt="Deku Burger" class="mb-6 h-36 w-auto" />
	<form
		method="POST"
		class="w-full max-w-sm space-y-4 card p-6"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update();
				busy = false;
			};
		}}
	>
		<h1 class="page-title">Acesso da equipe</h1>
		{#if !data.configured}
			<p class="alert-warn">
				Configure PUBLIC_SUPABASE_URL e PUBLIC_SUPABASE_ANON_KEY para habilitar o login.
			</p>
		{/if}
		<FormError message={form?.error} />
		<div>
			<label class="label" for="email">E-mail</label>
			<input
				class="field"
				id="email"
				name="email"
				type="email"
				autocomplete="username"
				required
				value={form?.email ?? ''}
			/>
		</div>
		<div>
			<label class="label" for="password">Senha</label>
			<input
				class="field"
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
			/>
		</div>
		<button class="btn-primary w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
	</form>
</main>
