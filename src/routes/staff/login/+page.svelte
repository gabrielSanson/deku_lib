<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';

	let { data, form } = $props();
	let busy = $state(false);
	let showPassword = $state(false);
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
			<div class="relative">
				<Icon
					name="mail"
					class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-stone-400"
				/>
				<input
					class="field pl-10"
					id="email"
					name="email"
					type="email"
					autocomplete="username"
					placeholder="voce@email.com"
					required
					value={form?.email ?? ''}
				/>
			</div>
		</div>
		<div>
			<label class="label" for="password">Senha</label>
			<div class="relative">
				<Icon
					name="lock"
					class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-stone-400"
				/>
				<input
					class="field pr-12 pl-10"
					id="password"
					name="password"
					type={showPassword ? 'text' : 'password'}
					autocomplete="current-password"
					placeholder="Sua senha"
					required
				/>
				<button
					type="button"
					class="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-(--radius-control) text-stone-500 hover:text-ink"
					aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
					aria-pressed={showPassword}
					onclick={() => (showPassword = !showPassword)}
				>
					<Icon name={showPassword ? 'eyeOff' : 'eye'} class="size-5" />
				</button>
			</div>
		</div>
		<button class="relative btn-primary w-full" disabled={busy}>
			{busy ? 'Entrando…' : 'Entrar'}
			<Icon name="arrow" class="absolute right-4 size-5" />
		</button>
		<p class="flex items-center justify-center gap-2 text-xs text-muted">
			<Icon name="lock" class="size-4" />Acesso restrito à equipe da loja
		</p>
	</form>
	<a
		href="/"
		class="mt-6 text-sm font-medium text-stone-300 underline underline-offset-4 hover:text-white"
		>Voltar ao site</a
	>
</main>
