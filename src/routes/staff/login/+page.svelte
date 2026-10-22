<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';

	let { data, form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Entrar · Equipe</title></svelte:head>

<main class="relative isolate flex min-h-dvh flex-col items-center justify-center bg-night p-4">
	<!-- Same dark kitchen backdrop as the storefront hero, dimmed so the form stays readable. -->
	<img
		src="/hero/background-1920.webp"
		srcset="/hero/background-960.webp 960w, /hero/background-1920.webp 1920w"
		sizes="100vw"
		alt=""
		class="absolute inset-0 -z-10 size-full object-cover"
	/>
	<div class="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/40 to-black/80"></div>
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
		<div>
			<h1 class="page-title">Acesso da equipe</h1>
			<p class="mt-1 text-sm text-muted">Entre para acompanhar pedidos, cardápio e vendas.</p>
		</div>
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
	<a
		href="/"
		class="mt-6 text-sm font-medium text-stone-300 underline underline-offset-4 hover:text-white"
		>Voltar ao site</a
	>
</main>
